package com.paymentorchestration.admin.service;

import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.payment.dto.PaymentSucceededEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class EmailNotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${notification.email.from}")
    private String fromAddress;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm 'UTC'").withZone(ZoneId.of("UTC"));

    public void sendPaymentSuccessEmail(DemoPolicy policy, PaymentSucceededEvent event) {
        if (mailSender == null) {
            log.warn("[email] JavaMailSender not configured — skipping email for transactionId={}", event.getTransactionId());
            return;
        }
        try {
            boolean isPremium = event.getPaymentType() == PaymentType.PREMIUM_COLLECTION;
            String subject = isPremium
                    ? "Payment Successful — " + policy.getInsuranceType() + " Policy " + policy.getPolicyNumber() + " is Now Active"
                    : "Claim Disbursement Processed — Reference " + policy.getClaimReference();
            String html = isPremium
                    ? buildPremiumHtml(policy, event)
                    : buildClaimHtml(policy, event);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(policy.getHolderEmail());
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[email] sent {} email to {} for transactionId={}",
                    event.getPaymentType(), policy.getHolderEmail(), event.getTransactionId());
        } catch (Exception e) {
            log.warn("[email] failed to send email for transactionId={}: {}", event.getTransactionId(), e.getMessage());
        }
    }

    private String buildPremiumHtml(DemoPolicy policy, PaymentSucceededEvent event) {
        String amount = formatAmount(event.getAmount(), event.getCurrency().name());
        String date   = DATE_FMT.format(event.getSucceededAt());
        return """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#FCB900;padding:32px 32px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#261900;letter-spacing:-0.5px;">Payment Successful</div>
                <div style="font-size:14px;color:#5c4200;margin-top:6px;">Your insurance premium has been processed</div>
              </div>
              <div style="padding:32px;">
                <p style="font-size:16px;color:#1c1c1e;margin:0 0 8px;">Dear <strong>%s</strong>,</p>
                <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                  Your payment of <strong>%s</strong> was successfully processed. Your insurance policy is now active and your coverage has begun.
                </p>
                <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                  %s
                  %s
                  %s
                  %s
                  %s
                </table>
                <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
                  This is an automated confirmation. Please keep this for your records.
                </p>
              </div>
            </div>
            """.formatted(
                policy.getHolderName(), amount,
                row("Policy Number",   policy.getPolicyNumber()),
                row("Insurance Type",  policy.getInsuranceType()),
                row("Amount Paid",     amount),
                row("Payment Provider", event.getProvider().name()),
                row("Date",            date)
        );
    }

    private String buildClaimHtml(DemoPolicy policy, PaymentSucceededEvent event) {
        String amount = formatAmount(event.getAmount(), event.getCurrency().name());
        String date   = DATE_FMT.format(event.getSucceededAt());
        return """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#FCB900;padding:32px 32px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#261900;letter-spacing:-0.5px;">Claim Disbursement Processed</div>
                <div style="font-size:14px;color:#5c4200;margin-top:6px;">Your claim payout has been initiated</div>
              </div>
              <div style="padding:32px;">
                <p style="font-size:16px;color:#1c1c1e;margin:0 0 8px;">Dear <strong>%s</strong>,</p>
                <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                  Your claim disbursement of <strong>%s</strong> has been successfully processed. Funds will be credited to your account within 1–3 business days.
                </p>
                <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                  %s
                  %s
                  %s
                  %s
                </table>
                <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
                  This is an automated confirmation. Please keep this for your records.
                </p>
              </div>
            </div>
            """.formatted(
                policy.getHolderName(), amount,
                row("Claim Reference",  policy.getClaimReference()),
                row("Amount",          amount),
                row("Payment Provider", event.getProvider().name()),
                row("Date",            date)
        );
    }

    private static String row(String label, String value) {
        return """
            <tr>
              <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;width:45%%;">%s</td>
              <td style="padding:10px 0;color:#1c1c1e;font-weight:600;border-bottom:1px solid #f3f4f6;">%s</td>
            </tr>
            """.formatted(label, value != null ? value : "—");
    }

    private static String formatAmount(BigDecimal amount, String currency) {
        return currency + " " + (amount != null ? String.format("%.2f", amount) : "0.00");
    }
}

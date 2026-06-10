package com.paymentorchestration.admin.service;

import com.paymentorchestration.common.enums.PaymentType;
import com.paymentorchestration.domain.entity.DemoPolicy;
import com.paymentorchestration.domain.entity.Transaction;
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

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

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

    public void sendQuoteEmail(DemoPolicy policy, String paymentLink) {
        if (mailSender == null) {
            log.warn("[email] JavaMailSender not configured — skipping quote email for policyId={}", policy.getId());
            return;
        }
        try {
            String subject = "Your InsureRoute Quote — " + policy.getInsuranceType()
                    + " (" + policy.getPolicyNumber() + ")";
            String html = buildQuoteHtml(policy, paymentLink);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(policy.getHolderEmail());
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[email] sent quote email to {} for policyId={}", policy.getHolderEmail(), policy.getId());
        } catch (Exception e) {
            log.warn("[email] failed to send quote email for policyId={}: {}", policy.getId(), e.getMessage());
        }
    }

    public void sendPaymentFailedEmail(DemoPolicy policy, Transaction tx) {
        if (mailSender == null) {
            log.warn("[email] JavaMailSender not configured — skipping failure email for transactionId={}", tx.getId());
            return;
        }
        try {
            boolean isPremium = tx.getPaymentType() == PaymentType.PREMIUM_COLLECTION;
            String subject = isPremium
                    ? "Payment Failed — Policy " + policy.getPolicyNumber() + " requires your attention"
                    : "Claim Disbursement Failed — Reference " + policy.getClaimReference();
            String html = buildFailureHtml(policy, tx, isPremium);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(policy.getHolderEmail());
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[email] sent failure email to {} for transactionId={}", policy.getHolderEmail(), tx.getId());
        } catch (Exception e) {
            log.warn("[email] failed to send failure email for transactionId={}: {}", tx.getId(), e.getMessage());
        }
    }

    private String buildFailureHtml(DemoPolicy policy, Transaction tx, boolean isPremium) {
        String amount = formatAmount(tx.getAmount(), tx.getCurrency().name());
        String date   = DATE_FMT.format(tx.getUpdatedAt());
        String ref    = isPremium ? policy.getPolicyNumber() : policy.getClaimReference();
        String refLabel = isPremium ? "Policy Number" : "Claim Reference";

        if (isPremium) {
            String paymentLink = appBaseUrl + "/store/complete?policyId=" + policy.getId();
            String statusLink  = appBaseUrl + "/store/policy/" + policy.getId();
            return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                  <div style="background:#991B1B;padding:32px 32px 24px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Payment Failed</div>
                    <div style="font-size:14px;color:#fca5a5;margin-top:6px;">All retry attempts have been exhausted</div>
                  </div>
                  <div style="padding:32px;">
                    <p style="font-size:16px;color:#1c1c1e;margin:0 0 8px;">Dear <strong>%s</strong>,</p>
                    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                      We were unable to process your insurance premium payment after multiple attempts.
                      Your policy is not yet active. Please click the button below to try again — your details have been saved.
                    </p>
                    <table style="width:100%%;border-collapse:collapse;font-size:14px;margin-bottom:28px;">
                      %s
                      %s
                      %s
                    </table>
                    <div style="text-align:center;margin-bottom:16px;">
                      <a href="%s" style="display:inline-block;background:#FCB900;color:#261900;font-weight:700;font-size:15px;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.01em;">
                        Retry Payment →
                      </a>
                    </div>
                    <div style="text-align:center;margin-bottom:24px;">
                      <a href="%s" style="font-size:13px;color:#6b7280;text-decoration:underline;">View policy status online</a>
                    </div>
                    <p style="font-size:13px;color:#9ca3af;margin:0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
                      This is an automated notification. If you continue to experience issues, please contact our support team.
                    </p>
                  </div>
                </div>
                """.formatted(
                    policy.getHolderName(),
                    row(refLabel, ref),
                    row("Amount",  amount),
                    row("Date",    date),
                    paymentLink,
                    statusLink
            );
        } else {
            return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                  <div style="background:#991B1B;padding:32px 32px 24px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Disbursement Failed</div>
                    <div style="font-size:14px;color:#fca5a5;margin-top:6px;">All retry attempts have been exhausted</div>
                  </div>
                  <div style="padding:32px;">
                    <p style="font-size:16px;color:#1c1c1e;margin:0 0 8px;">Dear <strong>%s</strong>,</p>
                    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                      We were unable to complete your claim disbursement after multiple attempts. Please contact our support team and quote your claim reference below.
                    </p>
                    <table style="width:100%%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                      %s
                      %s
                      %s
                    </table>
                    <p style="font-size:13px;color:#9ca3af;margin:0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
                      This is an automated notification. No further retry attempts will be made.
                    </p>
                  </div>
                </div>
                """.formatted(
                    policy.getHolderName(),
                    row(refLabel, ref),
                    row("Amount",  amount),
                    row("Date",    date)
            );
        }
    }

    private String buildPremiumHtml(DemoPolicy policy, PaymentSucceededEvent event) {
        String amount     = formatAmount(event.getAmount(), event.getCurrency().name());
        String date       = DATE_FMT.format(event.getSucceededAt());
        String statusLink = appBaseUrl + "/store/policy/" + policy.getId();
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
                <table style="width:100%%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
                  %s
                  %s
                  %s
                  %s
                  %s
                </table>
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="%s" style="display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;color:#374151;font-weight:600;font-size:14px;text-decoration:none;padding:12px 32px;border-radius:8px;">
                    View Policy Status →
                  </a>
                </div>
                <p style="font-size:13px;color:#9ca3af;margin:0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
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
                row("Date",            date),
                statusLink
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

    private String buildQuoteHtml(DemoPolicy policy, String paymentLink) {
        String amount = formatAmount(policy.getAmount(), policy.getCurrency());
        return """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#FCB900;padding:32px 32px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:#261900;letter-spacing:-0.5px;">Your Quote is Ready</div>
                <div style="font-size:14px;color:#5c4200;margin-top:6px;">Click below to complete your insurance application</div>
              </div>
              <div style="padding:32px;">
                <p style="font-size:16px;color:#1c1c1e;margin:0 0 8px;">Dear <strong>%s</strong>,</p>
                <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                  Thank you for applying with InsureRoute. Your quote has been saved and is ready for payment.
                  Simply click the button below to complete your purchase — no need to re-enter your details.
                </p>
                <table style="width:100%%;border-collapse:collapse;font-size:14px;margin-bottom:28px;">
                  %s
                  %s
                  %s
                </table>
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="%s" style="display:inline-block;background:#FCB900;color:#261900;font-weight:700;font-size:15px;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.01em;">
                    Complete Payment →
                  </a>
                </div>
                <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                  <p style="font-size:13px;color:#92400E;margin:0;line-height:1.6;">
                    <strong>Quote valid for 7 days.</strong> After this period, you will need to re-apply.
                    If you did not request this quote, you can safely ignore this email.
                  </p>
                </div>
                <p style="font-size:13px;color:#9ca3af;margin:0;border-top:1px solid #f3f4f6;padding-top:20px;line-height:1.6;">
                  This is an automated message from InsureRoute. Please keep your quote reference for your records.
                </p>
              </div>
            </div>
            """.formatted(
                policy.getHolderName(),
                row("Quote Reference", policy.getPolicyNumber()),
                row("Insurance Plan",  policy.getInsuranceType()),
                row("Premium Amount",  amount),
                paymentLink
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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [NgIf, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss'
})
export class PaymentResultComponent implements OnInit {
  transactionId: string | null = null;
  status: string = 'SUCCESS';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.transactionId = this.route.snapshot.queryParamMap.get('transactionId');
    this.status = this.route.snapshot.queryParamMap.get('status') ?? 'SUCCESS';
  }

  viewTransaction(): void {
    if (this.transactionId) this.router.navigate(['/transactions', this.transactionId]);
  }

  backToDemo(): void {
    this.router.navigate(['/demo']);
  }

  get isSuccess(): boolean {
    return this.status === 'SUCCESS';
  }
}

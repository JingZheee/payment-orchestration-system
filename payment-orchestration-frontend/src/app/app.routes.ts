import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'demo', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'demo',
    canActivate: [authGuard],
    loadComponent: () => import('./features/demo/demo-payment/demo-payment.component').then(m => m.DemoPaymentComponent)
  },
  {
    path: 'transactions/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/transactions/transaction-detail/transaction-detail.component').then(m => m.TransactionDetailComponent)
  },
  {
    path: 'payment-result',
    loadComponent: () => import('./features/demo/payment-result/payment-result.component').then(m => m.PaymentResultComponent)
  },
  { path: '**', redirectTo: 'demo' }
];

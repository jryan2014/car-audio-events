import { supabase } from '../lib/supabase';
import { Invoice } from './billingService';

interface InvoiceData extends Invoice {
  user?: {
    name: string;
    email: string;
    address?: string;
  };
  membership_plan?: {
    name: string;
    billing_period: string;
  };
}

class InvoiceService {
  /**
   * Generate an HTML invoice that can be printed as PDF
   */
  async generateInvoiceHTML(invoiceId: string, userId: string): Promise<string> {
    try {
      // Fetch invoice with related data
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          users!user_id (
            name,
            email,
            billing_address
          ),
          subscriptions!subscription_id (
            membership_plans (
              name,
              billing_period
            )
          )
        `)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      if (error || !invoice) {
        throw new Error('Invoice not found');
      }

      // Format invoice data
      const invoiceData: InvoiceData = {
        ...invoice,
        user: invoice.users,
        membership_plan: invoice.subscriptions?.membership_plans
      };

      return this.generateHTMLTemplate(invoiceData);
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * Generate HTML template for invoice
   */
  private generateHTMLTemplate(invoice: InvoiceData): string {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: invoice.currency || 'USD'
      }).format(amount);
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0ea5e9;
    }
    
    .company-info h1 {
      color: #0ea5e9;
      margin: 0 0 10px 0;
    }
    
    .invoice-details {
      text-align: right;
    }
    
    .invoice-details h2 {
      color: #0ea5e9;
      margin: 0 0 10px 0;
    }
    
    .invoice-details p {
      margin: 5px 0;
    }
    
    .billing-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    
    .billing-info h3 {
      color: #0ea5e9;
      margin: 0 0 10px 0;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    
    .items-table th {
      background-color: #0ea5e9;
      color: white;
      padding: 12px;
      text-align: left;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .totals-table {
      width: 300px;
    }
    
    .totals-table tr {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .totals-table .total-row {
      font-weight: bold;
      font-size: 1.2em;
      border-top: 2px solid #0ea5e9;
      padding-top: 12px;
      color: #0ea5e9;
    }
    
    .footer {
      text-align: center;
      color: #666;
      font-size: 0.9em;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    
    .status-paid {
      background-color: #10b981;
      color: white;
    }
    
    .status-open {
      background-color: #f59e0b;
      color: white;
    }
    
    .status-void {
      background-color: #ef4444;
      color: white;
    }
    
    @media screen {
      .print-button {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #0ea5e9;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      }
      
      .print-button:hover {
        background-color: #0284c7;
      }
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
  
  <div class="invoice-header">
    <div class="company-info">
      <h1>Car Audio Events</h1>
      <p>Your Premier Car Audio Competition Platform</p>
      <p>support@caraudioevents.com</p>
    </div>
    
    <div class="invoice-details">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
      <p><strong>Date:</strong> ${formatDate(invoice.created_at)}</p>
      <p><strong>Due Date:</strong> ${invoice.due_date ? formatDate(invoice.due_date) : 'Upon Receipt'}</p>
      <p>
        <span class="status-badge status-${invoice.status}">
          ${invoice.status.toUpperCase()}
        </span>
      </p>
    </div>
  </div>
  
  <div class="billing-info">
    <div class="bill-to">
      <h3>Bill To:</h3>
      <p><strong>${invoice.user?.name || 'Customer'}</strong></p>
      <p>${invoice.user?.email || ''}</p>
      ${invoice.user?.address ? `<p>${invoice.user.address}</p>` : ''}
    </div>
    
    <div class="payment-info">
      <h3>Payment Information:</h3>
      <p><strong>Payment Method:</strong> ${invoice.payment_provider || 'N/A'}</p>
      ${invoice.paid_at ? `<p><strong>Paid On:</strong> ${formatDate(invoice.paid_at)}</p>` : ''}
      ${invoice.provider_invoice_id ? `<p><strong>Transaction ID:</strong> ${invoice.provider_invoice_id}</p>` : ''}
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.line_items && invoice.line_items.length > 0 
        ? invoice.line_items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align: right">${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')
        : `
          <tr>
            <td>${invoice.membership_plan?.name || 'Subscription'} - ${invoice.membership_plan?.billing_period || 'Monthly'}</td>
            <td style="text-align: right">${formatCurrency(invoice.subtotal)}</td>
          </tr>
        `
      }
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-table">
      <div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Subtotal:</span>
          <span>${formatCurrency(invoice.subtotal)}</span>
        </div>
        ${invoice.discount_amount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span>Discount:</span>
            <span>-${formatCurrency(invoice.discount_amount)}</span>
          </div>
        ` : ''}
        ${invoice.tax_amount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span>Tax:</span>
            <span>${formatCurrency(invoice.tax_amount)}</span>
          </div>
        ` : ''}
        <div class="total-row" style="display: flex; justify-content: space-between;">
          <span>Total:</span>
          <span>${formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>Car Audio Events - Powered by passion for car audio</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Download invoice as HTML file that opens in new tab for printing
   */
  async downloadInvoice(invoiceId: string, userId: string): Promise<void> {
    try {
      // First try to get Stripe invoice URL if available
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { invoiceId }
      });

      if (!error && data?.invoice?.hosted_invoice_url) {
        // If Stripe has a hosted invoice URL, use that
        window.open(data.invoice.hosted_invoice_url, '_blank');
        return;
      }

      // Otherwise generate our own HTML invoice
      const html = await this.generateInvoiceHTML(invoiceId, userId);
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Auto-trigger print dialog after content loads
        printWindow.onload = () => {
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  /**
   * Get all invoices for a user
   */
  async getUserInvoices(userId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subscriptions!subscription_id (
            membership_plans (
              name,
              billing_period
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user invoices:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService(); 
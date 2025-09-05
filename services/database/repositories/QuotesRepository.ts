import databaseService from '../index';
import { ErrorHandler, AppError, ErrorCode } from '../../../utils/errorHandler';
import { QuoteResult, QuotedProduct } from '../../../types';

export class QuotesRepository {
  async getAllQuotes(): Promise<QuoteResult[]> {
    try {
      // First get all quotes
      const quotesQuery = `
        SELECT 
          id,
          patient_name,
          internal_summary,
          patient_message,
          medical_history,
          doctor_notes,
          observations,
          validity,
          total_value,
          created_at,
          updated_at
        FROM quotes
        ORDER BY created_at DESC
      `;
      
      const quotesResult = await databaseService.query(quotesQuery);
      
      // Get all quoted products for these quotes
      if (quotesResult.rows.length === 0) {
        return [];
      }
      
      const quoteIds = quotesResult.rows.map((q: any) => q.id);
      const productsQuery = `
        SELECT 
          id,
          quote_id,
          name,
          quantity,
          concentration,
          status,
          created_at
        FROM quoted_products
        WHERE quote_id = ANY($1)
        ORDER BY created_at
      `;
      
      const productsResult = await databaseService.query(productsQuery, [quoteIds]);
      
      // Group products by quote_id
      const productsByQuoteId: { [key: string]: QuotedProduct[] } = {};
      productsResult.rows.forEach((productRow: any) => {
        if (!productsByQuoteId[productRow.quote_id]) {
          productsByQuoteId[productRow.quote_id] = [];
        }
        productsByQuoteId[productRow.quote_id].push({
          name: productRow.name,
          quantity: productRow.quantity,
          concentration: productRow.concentration,
          status: productRow.status
        });
      });
      
      // Map quotes with their products
      return quotesResult.rows.map((row: any) => ({
        id: row.id,
        patientName: row.patient_name,
        internalSummary: row.internal_summary,
        patientMessage: row.patient_message,
        medicalHistory: row.medical_history,
        doctorNotes: row.doctor_notes,
        observations: row.observations,
        validity: row.validity,
        products: productsByQuoteId[row.id] || [],
        totalValue: row.total_value
      }));
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to get quotes');
    }
  }

  async createQuote(quote: Omit<QuoteResult, 'id'> & { products: Omit<QuotedProduct, 'id'>[] }): Promise<QuoteResult> {
    try {
      // Insert quote
      const quoteQuery = `
        INSERT INTO quotes (
          patient_name,
          internal_summary,
          patient_message,
          medical_history,
          doctor_notes,
          observations,
          validity,
          total_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at, updated_at
      `;
      
      const quoteValues = [
        quote.patientName,
        quote.internalSummary,
        quote.patientMessage,
        quote.medicalHistory,
        quote.doctorNotes,
        quote.observations,
        quote.validity,
        quote.totalValue
      ];
      
      const quoteResult = await databaseService.query(quoteQuery, quoteValues);
      const quoteId = quoteResult.rows[0].id;
      
      // Insert quoted products
      const products: QuotedProduct[] = [];
      for (const product of quote.products) {
        const productQuery = `
          INSERT INTO quoted_products (
            quote_id,
            name,
            quantity,
            concentration,
            status
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const productValues = [
          quoteId,
          product.name,
          product.quantity,
          product.concentration,
          product.status
        ];
        
        const productResult = await databaseService.query(productQuery, productValues);
        products.push({
          name: product.name,
          quantity: product.quantity,
          concentration: product.concentration,
          status: product.status
        });
      }
      
      return {
        id: quoteId,
        patientName: quote.patientName,
        internalSummary: quote.internalSummary,
        patientMessage: quote.patientMessage,
        medicalHistory: quote.medicalHistory,
        doctorNotes: quote.doctorNotes,
        observations: quote.observations,
        validity: quote.validity,
        products: products,
        totalValue: quote.totalValue
      };
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to create quote');
    }
  }

  async deleteQuote(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM quotes WHERE id = $1';
      const result = await databaseService.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to delete quote');
    }
  }
}

export const quotesRepository = new QuotesRepository();
import { apiClient as databaseClient } from '../apiClient';
import type { Settings, Product } from '../../../types';

class SettingsRepository {
  async getCurrentSettings(): Promise<Settings | null> {
    try {
      const settingsResult = await databaseClient.query(`
        SELECT * FROM settings ORDER BY id DESC LIMIT 1
      `);

      if (settingsResult.rows.length === 0) {
        return null;
      }

      const settingsRow = settingsResult.rows[0];

      // Get products for this settings
      const productsResult = await databaseClient.query(`
        SELECT * FROM products WHERE settings_id = $1 ORDER BY id
      `, [settingsRow.id]);

      const products: Product[] = productsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description || '',
        icon: row.icon || ''
      }));

      const settings: Settings = {
        associationName: settingsRow.association_name,
        about: settingsRow.about,
        operatingHours: settingsRow.operating_hours,
        productionTime: settingsRow.production_time,
        address: settingsRow.address,
        whatsapp: settingsRow.whatsapp,
        site: settingsRow.site,
        instagram: settingsRow.instagram,
        pixKey: settingsRow.pix_key,
        companyName: settingsRow.company_name,
        bankName: settingsRow.bank_name,
        products: products,
        databaseConfig: {
          type: 'postgres',
          host: databaseClient.getConfig().host,
          port: databaseClient.getConfig().port.toString(),
          user: databaseClient.getConfig().user,
          password: databaseClient.getConfig().password,
          database: databaseClient.getConfig().database
        }
      };

      return settings;
    } catch (error) {
      console.error('Error getting current settings:', error);
      return null;
    }
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    try {
      // Start transaction
      const queries = [];

      // Check if settings exist
      const existingResult = await databaseClient.query('SELECT id FROM settings LIMIT 1');
      
      let settingsId: number;

      if (existingResult.rows.length > 0) {
        // Update existing settings
        settingsId = existingResult.rows[0].id;
        
        queries.push({
          query: `
            UPDATE settings SET
              association_name = $1,
              about = $2,
              operating_hours = $3,
              production_time = $4,
              address = $5,
              whatsapp = $6,
              site = $7,
              instagram = $8,
              pix_key = $9,
              company_name = $10,
              bank_name = $11,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
          `,
          params: [
            settings.associationName,
            settings.about,
            settings.operatingHours,
            settings.productionTime,
            settings.address,
            settings.whatsapp,
            settings.site,
            settings.instagram,
            settings.pixKey,
            settings.companyName,
            settings.bankName,
            settingsId
          ]
        });
      } else {
        // Insert new settings
        const insertResult = await databaseClient.query(`
          INSERT INTO settings (
            association_name, about, operating_hours, production_time,
            address, whatsapp, site, instagram, pix_key, company_name, bank_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          settings.associationName,
          settings.about,
          settings.operatingHours,
          settings.productionTime,
          settings.address,
          settings.whatsapp,
          settings.site,
          settings.instagram,
          settings.pixKey,
          settings.companyName,
          settings.bankName
        ]);

        settingsId = insertResult.rows[0].id;
      }

      // Delete existing products
      await databaseClient.query('DELETE FROM products WHERE settings_id = $1', [settingsId]);

      // Insert new products
      if (settings.products && settings.products.length > 0) {
        for (const product of settings.products) {
          await databaseClient.query(`
            INSERT INTO products (name, price, description, icon, settings_id)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            product.name,
            product.price,
            product.description || '',
            product.icon || '',
            settingsId
          ]);
        }
      }

      // Execute all queries in transaction
      await databaseClient.transaction(queries);

      // Return updated settings
      return await this.getCurrentSettings() || settings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      const result = await databaseClient.query(`
        SELECT p.* FROM products p
        JOIN settings s ON p.settings_id = s.id
        ORDER BY p.id
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description || '',
        icon: row.icon || ''
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      // Get current settings ID
      const settingsResult = await databaseClient.query('SELECT id FROM settings LIMIT 1');
      if (settingsResult.rows.length === 0) {
        throw new Error('No settings found. Please configure settings first.');
      }

      const settingsId = settingsResult.rows[0].id;

      const result = await databaseClient.query(`
        INSERT INTO products (name, price, description, icon, settings_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        product.name,
        product.price,
        product.description || '',
        product.icon || '',
        settingsId
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description || '',
        icon: row.icon || ''
      };
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  async updateProduct(product: Product): Promise<Product> {
    try {
      const result = await databaseClient.query(`
        UPDATE products SET
          name = $1,
          price = $2,
          description = $3,
          icon = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [
        product.name,
        product.price,
        product.description || '',
        product.icon || '',
        product.id
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Product with id ${product.id} not found`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description || '',
        icon: row.icon || ''
      };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: number): Promise<boolean> {
    try {
      const result = await databaseClient.query(
        'DELETE FROM products WHERE id = $1',
        [productId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
}

export const settingsRepository = new SettingsRepository();
export default settingsRepository;
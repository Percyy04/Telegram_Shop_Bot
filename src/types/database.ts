export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          emoji: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          emoji?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          emoji?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          sku: string;
          name: string;
          description: string | null;
          sale_price: number;
          warranty_text: string | null;
          delivery_note: string | null;
          image_url: string | null;
          min_quantity: number;
          max_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          sku: string;
          name: string;
          description?: string | null;
          sale_price: number;
          warranty_text?: string | null;
          delivery_note?: string | null;
          image_url?: string | null;
          min_quantity?: number;
          max_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          sku?: string;
          name?: string;
          description?: string | null;
          sale_price?: number;
          warranty_text?: string | null;
          delivery_note?: string | null;
          image_url?: string | null;
          min_quantity?: number;
          max_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          code: string;
          telegram_user_id: number;
          telegram_username: string | null;
          telegram_first_name: string | null;
          status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'DELIVERY_PENDING' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
          total_amount: number;
          payment_reference: string;
          expires_at: string | null;
          paid_at: string | null;
          delivery_started_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          telegram_user_id: number;
          telegram_username?: string | null;
          telegram_first_name?: string | null;
          status?: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'DELIVERY_PENDING' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
          total_amount: number;
          payment_reference: string;
          expires_at?: string | null;
          paid_at?: string | null;
          delivery_started_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          telegram_user_id?: number;
          telegram_username?: string | null;
          telegram_first_name?: string | null;
          status?: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'DELIVERY_PENDING' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
          total_amount?: number;
          payment_reference?: string;
          expires_at?: string | null;
          paid_at?: string | null;
          delivery_started_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name_snapshot: string;
          unit_price_snapshot: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name_snapshot: string;
          unit_price_snapshot: number;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name_snapshot?: string;
          unit_price_snapshot?: number;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      stock_units: {
        Row: {
          id: string;
          product_id: string;
          delivery_payload_encrypted: string;
          status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DISABLED';
          reserved_order_id: string | null;
          sold_order_id: string | null;
          import_note: string | null;
          imported_by: string | null;
          reserved_at: string | null;
          sold_at: string | null;
          disabled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          delivery_payload_encrypted: string;
          status?: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DISABLED';
          reserved_order_id?: string | null;
          sold_order_id?: string | null;
          import_note?: string | null;
          imported_by?: string | null;
          reserved_at?: string | null;
          sold_at?: string | null;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          delivery_payload_encrypted?: string;
          status?: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DISABLED';
          reserved_order_id?: string | null;
          sold_order_id?: string | null;
          import_note?: string | null;
          imported_by?: string | null;
          reserved_at?: string | null;
          sold_at?: string | null;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_units_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          method: string;
          amount: number;
          transfer_reference: string;
          status: string;
          verification_method: 'WEBHOOK_SEPAY' | 'MANUAL' | null;
          webhook_transaction_id: string | null;
          transaction_content: string | null;
          transaction_received_at: string | null;
          amount_received: number | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          method?: string;
          amount: number;
          transfer_reference: string;
          status?: string;
          verification_method?: 'WEBHOOK_SEPAY' | 'MANUAL' | null;
          webhook_transaction_id?: string | null;
          transaction_content?: string | null;
          transaction_received_at?: string | null;
          amount_received?: number | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          method?: string;
          amount?: number;
          transfer_reference?: string;
          status?: string;
          verification_method?: 'WEBHOOK_SEPAY' | 'MANUAL' | null;
          webhook_transaction_id?: string | null;
          transaction_content?: string | null;
          transaction_received_at?: string | null;
          amount_received?: number | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_events: {
        Row: {
          id: string;
          provider: string;
          provider_transaction_id: string;
          payment_reference: string | null;
          transfer_amount: number | null;
          transfer_type: string | null;
          account_number_masked: string | null;
          transaction_content: string | null;
          gateway: string | null;
          reason: string | null;
          processing_status: string;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider?: string;
          provider_transaction_id: string;
          payment_reference?: string | null;
          transfer_amount?: number | null;
          transfer_type?: string | null;
          account_number_masked?: string | null;
          transaction_content?: string | null;
          gateway?: string | null;
          reason?: string | null;
          processing_status: string;
          received_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_transaction_id?: string;
          payment_reference?: string | null;
          transfer_amount?: number | null;
          transfer_type?: string | null;
          account_number_masked?: string | null;
          transaction_content?: string | null;
          gateway?: string | null;
          reason?: string | null;
          processing_status?: string;
          received_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      delivery_attempts: {
        Row: {
          id: string;
          order_id: string;
          status: 'PENDING' | 'SENDING' | 'SENT' | 'UNCERTAIN' | 'FAILED';
          attempt_count: number;
          telegram_chat_id: number;
          telegram_message_ids: Json;
          last_error: string | null;
          started_at: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status?: 'PENDING' | 'SENDING' | 'SENT' | 'UNCERTAIN' | 'FAILED';
          attempt_count?: number;
          telegram_chat_id: number;
          telegram_message_ids?: Json;
          last_error?: string | null;
          started_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: 'PENDING' | 'SENDING' | 'SENT' | 'UNCERTAIN' | 'FAILED';
          attempt_count?: number;
          telegram_chat_id?: number;
          telegram_message_ids?: Json;
          last_error?: string | null;
          started_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      warranty_requests: {
        Row: {
          id: string;
          order_id: string;
          telegram_user_id: number;
          status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
          customer_message: string;
          admin_note: string | null;
          customer_response: string | null;
          handled_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          telegram_user_id: number;
          status?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
          customer_message: string;
          admin_note?: string | null;
          customer_response?: string | null;
          handled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          telegram_user_id?: number;
          status?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
          customer_message?: string;
          admin_note?: string | null;
          customer_response?: string | null;
          handled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warranty_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_type: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
          actor_admin_id: string | null;
          actor_telegram_user_id: number | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_type: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
          actor_admin_id?: string | null;
          actor_telegram_user_id?: number | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_type?: 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
          actor_admin_id?: string | null;
          actor_telegram_user_id?: number | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_order_and_reserve_stock: {
        Args: {
          p_telegram_user_id: number;
          p_telegram_username: string | null;
          p_telegram_first_name: string | null;
          p_product_id: string;
          p_quantity: number;
          p_order_code: string;
          p_payment_reference: string;
          p_expires_at: string;
        };
        Returns: Json;
      };
      record_sepay_transaction: {
        Args: {
          p_provider_transaction_id: string;
          p_payment_reference: string | null;
          p_transfer_amount: number;
          p_transaction_content: string;
          p_transfer_type: string;
          p_gateway: string | null;
          p_account_number: string;
        };
        Returns: Json;
      };
      confirm_payment_manual: {
        Args: {
          p_order_id: string;
          p_admin_id: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      claim_delivery_attempt: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      mark_order_delivered: {
        Args: {
          p_order_id: string;
          p_attempt_id: string;
          p_message_ids: Json;
        };
        Returns: Json;
      };
      mark_delivery_failed: {
        Args: {
          p_attempt_id: string;
          p_error: string;
        };
        Returns: Json;
      };
      mark_delivery_uncertain: {
        Args: {
          p_attempt_id: string;
          p_error: string;
        };
        Returns: Json;
      };
      release_expired_orders: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

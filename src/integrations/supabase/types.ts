export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          staff_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          staff_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          category_id: string | null
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["article_status"] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          category_id?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_execution_log: {
        Row: {
          action_result: string | null
          action_type: string
          automation_rule_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          metadata: Json | null
          order_id: string | null
          template_key: string | null
          trigger_type: string
        }
        Insert: {
          action_result?: string | null
          action_type: string
          automation_rule_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json | null
          order_id?: string | null
          template_key?: string | null
          trigger_type: string
        }
        Update: {
          action_result?: string | null
          action_type?: string
          automation_rule_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          order_id?: string | null
          template_key?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_log_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          priority: number | null
          run_count: number | null
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json
          action_type: string
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          priority?: number | null
          run_count?: number | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          priority?: number | null
          run_count?: number | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          product_count: number
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          product_count?: number
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          product_count?: number
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          depth: number | null
          description: string | null
          group_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          product_count: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth?: number | null
          description?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          product_count?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth?: number | null
          description?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          product_count?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_care_tips: {
        Row: {
          category_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          tip_text: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tip_text: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tip_text?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_care_tips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_logos: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
          sort_order: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_auto: boolean | null
          subject_template: string | null
          template_key: string
          trigger_status: string | null
          updated_at: string | null
        }
        Insert: {
          body_template: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_auto?: boolean | null
          subject_template?: string | null
          template_key: string
          trigger_status?: string | null
          updated_at?: string | null
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_auto?: boolean | null
          subject_template?: string | null
          template_key?: string
          trigger_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_amount: number | null
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          start_date: string
          target_ids: string[] | null
          title: string
          type: string
          used_count: number | null
        }
        Insert: {
          applies_to?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          start_date: string
          target_ids?: string[] | null
          title: string
          type?: string
          used_count?: number | null
        }
        Update: {
          applies_to?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          start_date?: string
          target_ids?: string[] | null
          title?: string
          type?: string
          used_count?: number | null
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          automation_rule_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          priority: string | null
          queue: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          automation_rule_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string | null
          queue: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          automation_rule_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string | null
          queue?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line: string
          city: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          delivery_notes: string | null
          id: string
          is_default: boolean
          label: string | null
          region: string | null
          township: string | null
        }
        Insert: {
          address_line: string
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          delivery_notes?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          region?: string | null
          township?: string | null
        }
        Update: {
          address_line?: string
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          delivery_notes?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          region?: string | null
          township?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          customer_id: string
          direction: string
          id: string
          metadata: Json | null
          order_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string | null
          template_key: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          customer_id: string
          direction?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          customer_id?: string
          direction?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_manager: string | null
          company_name: string | null
          company_type: string | null
          created_at: string
          credit_limit: number
          customer_type: string
          email: string | null
          fraud_flags: string[] | null
          id: string
          is_approved_buyer: boolean
          name: string | null
          payment_terms: string
          phone: string | null
          risk_tier: string | null
          tags: string[] | null
          total_cancelled_orders: number | null
          total_cod_delivered: number | null
          total_cod_orders: number | null
          total_failed_deliveries: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_manager?: string | null
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          fraud_flags?: string[] | null
          id?: string
          is_approved_buyer?: boolean
          name?: string | null
          payment_terms?: string
          phone?: string | null
          risk_tier?: string | null
          tags?: string[] | null
          total_cancelled_orders?: number | null
          total_cod_delivered?: number | null
          total_cod_orders?: number | null
          total_failed_deliveries?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_manager?: string | null
          company_name?: string | null
          company_type?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          fraud_flags?: string[] | null
          id?: string
          is_approved_buyer?: boolean
          name?: string | null
          payment_terms?: string
          phone?: string | null
          risk_tier?: string | null
          tags?: string[] | null
          total_cancelled_orders?: number | null
          total_cod_delivered?: number | null
          total_cod_orders?: number | null
          total_failed_deliveries?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deletion_archive: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          id: string
          reason: string | null
          record_data: Json
          record_id: string
          table_name: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reason?: string | null
          record_data: Json
          record_id: string
          table_name: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reason?: string | null
          record_data?: Json
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          actual_route: Json | null
          assigned_at: string | null
          attempt_number: number | null
          codCollected: boolean | null
          created_at: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_proof_type: string | null
          delivery_proof_url: string | null
          driver_id: string
          driver_notes: string | null
          estimated_arrival: string | null
          failed_reason: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          order_id: string
          picked_up_at: string | null
          pickup_at: string | null
          proof_image_url: string | null
          recipient_name: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_route?: Json | null
          assigned_at?: string | null
          attempt_number?: number | null
          codCollected?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_proof_type?: string | null
          delivery_proof_url?: string | null
          driver_id: string
          driver_notes?: string | null
          estimated_arrival?: string | null
          failed_reason?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          pickup_at?: string | null
          proof_image_url?: string | null
          recipient_name?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_route?: Json | null
          assigned_at?: string | null
          attempt_number?: number | null
          codCollected?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_proof_type?: string | null
          delivery_proof_url?: string | null
          driver_id?: string
          driver_notes?: string | null
          estimated_arrival?: string | null
          failed_reason?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          pickup_at?: string | null
          proof_image_url?: string | null
          recipient_name?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_fees: {
        Row: {
          cod_eligible: boolean | null
          created_at: string | null
          estimated_days: string | null
          fee: number
          id: string
          is_active: boolean | null
          label: string
          max_cod_amount: number | null
          min_free_delivery: number | null
          sort_order: number | null
          zone: string
        }
        Insert: {
          cod_eligible?: boolean | null
          created_at?: string | null
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean | null
          label: string
          max_cod_amount?: number | null
          min_free_delivery?: number | null
          sort_order?: number | null
          zone: string
        }
        Update: {
          cod_eligible?: boolean | null
          created_at?: string | null
          estimated_days?: string | null
          fee?: number
          id?: string
          is_active?: boolean | null
          label?: string
          max_cod_amount?: number | null
          min_free_delivery?: number | null
          sort_order?: number | null
          zone?: string
        }
        Relationships: []
      }
      delivery_tracking_log: {
        Row: {
          assignment_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          photo_url: string | null
          status: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          photo_url?: string | null
          status: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          photo_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      dingar_config: {
        Row: {
          api_key: string
          base_url: string
          callback_key: string | null
          callback_url: string | null
          client_id: string | null
          created_at: string | null
          encryption_key: string | null
          environment: string
          fail_return_url: string | null
          id: string
          is_active: boolean | null
          merchant_name: string
          prebuilt_base_url: string
          project_name: string
          public_key: string
          return_url: string | null
          secret_key: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          base_url?: string
          callback_key?: string | null
          callback_url?: string | null
          client_id?: string | null
          created_at?: string | null
          encryption_key?: string | null
          environment?: string
          fail_return_url?: string | null
          id?: string
          is_active?: boolean | null
          merchant_name: string
          prebuilt_base_url?: string
          project_name: string
          public_key: string
          return_url?: string | null
          secret_key: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          base_url?: string
          callback_key?: string | null
          callback_url?: string | null
          client_id?: string | null
          created_at?: string | null
          encryption_key?: string | null
          environment?: string
          fail_return_url?: string | null
          id?: string
          is_active?: boolean | null
          merchant_name?: string
          prebuilt_base_url?: string
          project_name?: string
          public_key?: string
          return_url?: string | null
          secret_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          customer_id: string | null
          discount_type: string | null
          discount_value: number
          id: string
          new_total: number | null
          order_id: string | null
          original_total: number | null
          reason: string
          rejection_reason: string | null
          requested_by: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_type?: string | null
          discount_value: number
          id?: string
          new_total?: number | null
          order_id?: string | null
          original_total?: number | null
          reason: string
          rejection_reason?: string | null
          requested_by: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          new_total?: number | null
          order_id?: string | null
          original_total?: number | null
          reason?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "discount_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_deals: {
        Row: {
          badge_text: string | null
          created_at: string | null
          created_by: string | null
          discount_percentage: number | null
          end_time: string
          flash_price: number
          id: string
          is_active: boolean | null
          original_price: number
          product_id: string
          sold_count: number | null
          sort_order: number | null
          start_time: string
          stock_limit: number
          title: string | null
        }
        Insert: {
          badge_text?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_percentage?: number | null
          end_time: string
          flash_price: number
          id?: string
          is_active?: boolean | null
          original_price: number
          product_id: string
          sold_count?: number | null
          sort_order?: number | null
          start_time: string
          stock_limit?: number
          title?: string | null
        }
        Update: {
          badge_text?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_percentage?: number | null
          end_time?: string
          flash_price?: number
          id?: string
          is_active?: boolean | null
          original_price?: number
          product_id?: string
          sold_count?: number | null
          sort_order?: number | null
          start_time?: string
          stock_limit?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          created_at: string | null
          id: string
          metrics: Json
          period: string
          snapshot_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metrics?: Json
          period?: string
          snapshot_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metrics?: Json
          period?: string
          snapshot_date?: string
        }
        Relationships: []
      }
      order_edits: {
        Row: {
          created_at: string | null
          description: string
          edit_type: string
          edited_by: string
          id: string
          new_value: Json | null
          old_value: Json | null
          order_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          edit_type: string
          edited_by: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          order_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          edit_type?: string
          edited_by?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_edits_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_edits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          sku: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name?: string | null
          quantity: number
          sku?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          mentions: string[] | null
          order_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          mentions?: string[] | null
          order_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          mentions?: string[] | null
          order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          processed_at: string | null
          reason: string
          refund_method: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          processed_at?: string | null
          reason: string
          refund_method?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          processed_at?: string | null
          reason?: string
          refund_method?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string | null
          from_status: string | null
          id: string
          metadata: Json | null
          order_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_method: string | null
          delivery_zone: string | null
          dingar_transaction_id: string | null
          discount: number
          estimated_delivery: string | null
          id: string
          idempotency_key: string | null
          internal_notes: string | null
          order_number: string
          packed_at: string | null
          payment_channel: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_rejection_reason: string | null
          payment_status: string
          payment_verified_at: string | null
          payment_verified_by: string | null
          priority: string
          purchase_order_number: string | null
          requires_approval: boolean | null
          risk_assessed_at: string | null
          risk_flags: string[] | null
          risk_score: number | null
          shipped_at: string | null
          shipping_cost: number
          source: string | null
          status: string
          subtotal: number | null
          tax: number
          total: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_method?: string | null
          delivery_zone?: string | null
          dingar_transaction_id?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          order_number?: string
          packed_at?: string | null
          payment_channel?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_rejection_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          priority?: string
          purchase_order_number?: string | null
          requires_approval?: boolean | null
          risk_assessed_at?: string | null
          risk_flags?: string[] | null
          risk_score?: number | null
          shipped_at?: string | null
          shipping_cost?: number
          source?: string | null
          status?: string
          subtotal?: number | null
          tax?: number
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_method?: string | null
          delivery_zone?: string | null
          dingar_transaction_id?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          order_number?: string
          packed_at?: string | null
          payment_channel?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_rejection_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          priority?: string
          purchase_order_number?: string | null
          requires_approval?: boolean | null
          risk_assessed_at?: string | null
          risk_flags?: string[] | null
          risk_score?: number | null
          shipped_at?: string | null
          shipping_cost?: number
          source?: string | null
          status?: string
          subtotal?: number | null
          tax?: number
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dingar_transaction_id_fkey"
            columns: ["dingar_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          channel: string
          code: string
          created_at: string | null
          dingar_method_name: string
          dingar_provider_name: string
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          requires_billing_address: boolean | null
          requires_email: boolean | null
          requires_phone: boolean | null
          sort_order: number | null
        }
        Insert: {
          channel: string
          code: string
          created_at?: string | null
          dingar_method_name: string
          dingar_provider_name: string
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          requires_billing_address?: boolean | null
          requires_email?: boolean | null
          requires_phone?: boolean | null
          sort_order?: number | null
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string | null
          dingar_method_name?: string
          dingar_provider_name?: string
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          requires_billing_address?: boolean | null
          requires_email?: boolean | null
          requires_phone?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          callback_payload: Json | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          dingar_merch_order_id: string | null
          dingar_transaction_no: string | null
          error_code: string | null
          error_message: string | null
          form_token: string | null
          id: string
          initiated_at: string | null
          method_name: string
          order_id: string
          provider_name: string
          redirect_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          callback_payload?: Json | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          dingar_merch_order_id?: string | null
          dingar_transaction_no?: string | null
          error_code?: string | null
          error_message?: string | null
          form_token?: string | null
          id?: string
          initiated_at?: string | null
          method_name: string
          order_id: string
          provider_name: string
          redirect_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          callback_payload?: Json | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          dingar_merch_order_id?: string | null
          dingar_transaction_no?: string | null
          error_code?: string | null
          error_message?: string | null
          form_token?: string | null
          id?: string
          initiated_at?: string | null
          method_name?: string
          order_id?: string
          provider_name?: string
          redirect_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          customer_segment: string
          id: string
          max_qty: number | null
          min_qty: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_segment?: string
          id?: string
          max_qty?: number | null
          min_qty: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          customer_segment?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          currency: string
          data_completeness: number
          datasheet_url: string | null
          description: string
          enriched_by: string | null
          features: string | null
          group_id: string | null
          id: string
          images: Json
          is_active: boolean
          is_featured: boolean
          item_type: string | null
          last_enriched_at: string | null
          long_description: string | null
          main_vendor: string | null
          max_qty: number
          min_qty: number
          moq: number
          onhand_qty: number
          other_code: string | null
          packing: string | null
          reorder_qty: number
          search_vector: unknown
          selling_price: number | null
          short_description: string | null
          slug: string
          specifications: Json
          stock_code: string
          stock_status: string
          tags: string[] | null
          thumbnail_url: string | null
          unit_cost: number
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          data_completeness?: number
          datasheet_url?: string | null
          description: string
          enriched_by?: string | null
          features?: string | null
          group_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          item_type?: string | null
          last_enriched_at?: string | null
          long_description?: string | null
          main_vendor?: string | null
          max_qty?: number
          min_qty?: number
          moq?: number
          onhand_qty?: number
          other_code?: string | null
          packing?: string | null
          reorder_qty?: number
          search_vector?: unknown
          selling_price?: number | null
          short_description?: string | null
          slug: string
          specifications?: Json
          stock_code: string
          stock_status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          unit_cost?: number
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          data_completeness?: number
          datasheet_url?: string | null
          description?: string
          enriched_by?: string | null
          features?: string | null
          group_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          item_type?: string | null
          last_enriched_at?: string | null
          long_description?: string | null
          main_vendor?: string | null
          max_qty?: number
          min_qty?: number
          moq?: number
          onhand_qty?: number
          other_code?: string | null
          packing?: string | null
          reorder_qty?: number
          search_vector?: unknown
          selling_price?: number | null
          short_description?: string | null
          slug?: string
          specifications?: Json
          stock_code?: string
          stock_status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          unit_cost?: number
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_enriched_by_fkey"
            columns: ["enriched_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string
          banner_image_url: string | null
          buy_quantity: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_value: number | null
          end_date: string
          get_quantity: number | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          priority: number | null
          start_date: string
          target_ids: string[] | null
          title: string
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          applies_to?: string
          banner_image_url?: string | null
          buy_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_value?: number | null
          end_date: string
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          priority?: number | null
          start_date: string
          target_ids?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          applies_to?: string
          banner_image_url?: string | null
          buy_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_value?: number | null
          end_date?: string
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          priority?: number | null
          start_date?: string
          target_ids?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      queue_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          max_concurrent: number | null
          queue: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          max_concurrent?: number | null
          queue: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          max_concurrent?: number | null
          queue?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          additional_notes: string | null
          admin_internal_notes: string | null
          assigned_to: string | null
          attachments: Json
          budget_range: string | null
          company_name: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          converted_order_id: string | null
          created_at: string
          customer_id: string | null
          follow_up_date: string | null
          id: string
          items: Json
          priority: string
          project_type: string | null
          quote_number: string
          response_items: Json | null
          sales_rep_id: string | null
          source: string | null
          status: string
          timeline: string | null
          total_quoted: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          additional_notes?: string | null
          admin_internal_notes?: string | null
          assigned_to?: string | null
          attachments?: Json
          budget_range?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          follow_up_date?: string | null
          id?: string
          items: Json
          priority?: string
          project_type?: string | null
          quote_number?: string
          response_items?: Json | null
          sales_rep_id?: string | null
          source?: string | null
          status?: string
          timeline?: string | null
          total_quoted?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          additional_notes?: string | null
          admin_internal_notes?: string | null
          assigned_to?: string | null
          attachments?: Json
          budget_range?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          follow_up_date?: string | null
          id?: string
          items?: Json
          priority?: string
          project_type?: string | null
          quote_number?: string
          response_items?: Json | null
          sales_rep_id?: string | null
          source?: string | null
          status?: string
          timeline?: string | null
          total_quoted?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_response: string | null
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          responded_at: string | null
          responded_by: string | null
          reviewer_email: string | null
          reviewer_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          responded_at?: string | null
          responded_by?: string | null
          reviewer_email?: string | null
          reviewer_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_response?: string | null
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          responded_at?: string | null
          responded_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          notes: string | null
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          notes?: string | null
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "saved_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_lists: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_metrics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "saved_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_rules: {
        Row: {
          created_at: string | null
          escalation_message: string | null
          escalation_to: string | null
          id: string
          is_active: boolean | null
          queue: string
          target_minutes: number
          trigger_status: string
          warning_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          escalation_message?: string | null
          escalation_to?: string | null
          id?: string
          is_active?: boolean | null
          queue: string
          target_minutes: number
          trigger_status: string
          warning_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          escalation_message?: string | null
          escalation_to?: string | null
          id?: string
          is_active?: boolean | null
          queue?: string
          target_minutes?: number
          trigger_status?: string
          warning_minutes?: number | null
        }
        Relationships: []
      }
      sla_tracking: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          entered_at: string
          id: string
          is_breached: boolean | null
          is_escalated: boolean | null
          is_warning_sent: boolean | null
          order_id: string
          queue: string
          resolved_at: string | null
          sla_rule_id: string | null
          status_entered: string
          target_at: string
          warning_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          entered_at?: string
          id?: string
          is_breached?: boolean | null
          is_escalated?: boolean | null
          is_warning_sent?: boolean | null
          order_id: string
          queue: string
          resolved_at?: string | null
          sla_rule_id?: string | null
          status_entered: string
          target_at: string
          warning_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          entered_at?: string
          id?: string
          is_breached?: boolean | null
          is_escalated?: boolean | null
          is_warning_sent?: boolean | null
          order_id?: string
          queue?: string
          resolved_at?: string | null
          sla_rule_id?: string | null
          status_entered?: string
          target_at?: string
          warning_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_tracking_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_tracking_sla_rule_id_fkey"
            columns: ["sla_rule_id"]
            isOneToOne: false
            referencedRelation: "sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          metadata: Json | null
          staff_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          staff_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          staff_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_metrics: {
        Row: {
          address_count: number | null
          avg_order_value: number | null
          cancelled_orders: number | null
          communication_count: number | null
          company_name: string | null
          customer_id: string | null
          customer_since: string | null
          delivered_orders: number | null
          email: string | null
          fraud_flags: string[] | null
          frequency_90d: number | null
          last_order_date: string | null
          lifetime_value: number | null
          monetary_avg: number | null
          name: string | null
          orders_last_30d: number | null
          orders_last_90d: number | null
          phone: string | null
          preferred_payment: string | null
          recency_days: number | null
          rfm_segment: string | null
          risk_tier: string | null
          tags: string[] | null
          total_cancelled_orders: number | null
          total_cod: number | null
          total_failed_deliveries: number | null
          total_orders: number | null
          total_prepaid: number | null
        }
        Relationships: []
      }
      product_review_stats: {
        Row: {
          avg_rating: number | null
          five_star: number | null
          four_star: number | null
          one_star: number | null
          product_id: string | null
          review_count: number | null
          three_star: number | null
          two_star: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products_public: {
        Row: {
          brand_id: string | null
          brand_logo: string | null
          brand_name: string | null
          brand_slug: string | null
          category_depth: number | null
          category_id: string | null
          category_name: string | null
          category_parent_id: string | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          datasheet_url: string | null
          description: string | null
          features: string | null
          group_code: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          item_type: string | null
          long_description: string | null
          main_vendor: string | null
          max_qty: number | null
          min_qty: number | null
          moq: number | null
          onhand_qty: number | null
          other_code: string | null
          packing: string | null
          parent_category_name: string | null
          parent_category_slug: string | null
          reorder_qty: number | null
          search_vector: unknown
          selling_price: number | null
          short_description: string | null
          slug: string | null
          specifications: Json | null
          stock_code: string | null
          stock_status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["category_parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assess_order_risk: { Args: { p_order_id: string }; Returns: Json }
      bulk_update_product: {
        Args: {
          p_long_description: string
          p_selling_price: number
          p_short_description: string
          p_specifications: Json
          p_stock_code: string
          p_subcategory_name: string
          p_unit_of_measure: string
        }
        Returns: string
      }
      calculate_data_completeness: {
        Args: { _product_id: string }
        Returns: number
      }
      create_manual_order: {
        Args: {
          p_contact_name?: string
          p_contact_phone?: string
          p_created_by: string
          p_customer_id: string
          p_customer_notes?: string
          p_delivery_address_id?: string
          p_delivery_zone?: string
          p_internal_notes?: string
          p_items?: Json
          p_payment_method?: string
          p_source?: string
        }
        Returns: Json
      }
      get_automation_stats: { Args: { p_hours?: number }; Returns: Json }
      get_category_path: { Args: { cat_id: string }; Returns: string }
      get_customer_id: { Args: never; Returns: string }
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_live_kpis: { Args: never; Returns: Json }
      get_staff_department: { Args: never; Returns: string }
      get_staff_role:
        | { Args: never; Returns: string }
        | { Args: { _user_id: string }; Returns: string }
      get_staff_role_level: { Args: never; Returns: number }
      handle_dingar_callback: {
        Args: {
          p_callback_payload?: Json
          p_dingar_transaction_no: string
          p_status: string
        }
        Returns: Json
      }
      increment_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      place_order: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_coupon_code?: string
          p_customer_id: string
          p_customer_notes?: string
          p_delivery_address_id: string
          p_delivery_zone: string
          p_idempotency_key: string
          p_payment_method: string
          p_payment_proof_url?: string
          p_payment_reference?: string
        }
        Returns: Json
      }
      search_products: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          brand_logo: string
          brand_name: string
          brand_slug: string
          category_name: string
          category_slug: string
          currency: string
          description: string
          group_name: string
          id: string
          is_featured: boolean
          moq: number
          onhand_qty: number
          other_code: string
          rank: number
          selling_price: number
          short_description: string
          slug: string
          stock_code: string
          stock_status: string
          thumbnail_url: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      take_kpi_snapshot: { Args: { p_period?: string }; Returns: undefined }
    }
    Enums: {
      article_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      article_status: ["draft", "published", "archived"],
    },
  },
} as const

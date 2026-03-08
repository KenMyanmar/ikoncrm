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
          description: string | null
          group_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_count: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_count?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
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
            referencedRelation: "customers"
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
          id: string
          is_approved_buyer: boolean
          name: string | null
          payment_terms: string
          phone: string | null
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
          id?: string
          is_approved_buyer?: boolean
          name?: string | null
          payment_terms?: string
          phone?: string | null
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
          id?: string
          is_approved_buyer?: boolean
          name?: string | null
          payment_terms?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          customer_notes: string | null
          delivery_address_id: string | null
          delivery_method: string | null
          discount: number
          estimated_delivery: string | null
          id: string
          internal_notes: string | null
          order_number: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          purchase_order_number: string | null
          shipping_cost: number
          status: string
          subtotal: number | null
          tax: number
          total: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivery_address_id?: string | null
          delivery_method?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          purchase_order_number?: string | null
          shipping_cost?: number
          status?: string
          subtotal?: number | null
          tax?: number
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          delivery_address_id?: string | null
          delivery_method?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          purchase_order_number?: string | null
          shipping_cost?: number
          status?: string
          subtotal?: number | null
          tax?: number
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
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
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          currency: string
          datasheet_url: string | null
          description: string
          group_id: string | null
          id: string
          images: Json
          is_active: boolean
          is_featured: boolean
          item_type: string | null
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
          datasheet_url?: string | null
          description: string
          group_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          item_type?: string | null
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
          datasheet_url?: string | null
          description?: string
          group_id?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          item_type?: string | null
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
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          additional_notes: string | null
          attachments: Json
          budget_range: string | null
          converted_order_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          items: Json
          project_type: string | null
          quote_number: string
          response_items: Json | null
          sales_rep_id: string | null
          status: string
          timeline: string | null
          total_quoted: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          additional_notes?: string | null
          attachments?: Json
          budget_range?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          items: Json
          project_type?: string | null
          quote_number?: string
          response_items?: Json | null
          sales_rep_id?: string | null
          status?: string
          timeline?: string | null
          total_quoted?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          additional_notes?: string | null
          attachments?: Json
          budget_range?: string | null
          converted_order_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          items?: Json
          project_type?: string | null
          quote_number?: string
          response_items?: Json | null
          sales_rep_id?: string | null
          status?: string
          timeline?: string | null
          total_quoted?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
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
            referencedRelation: "customers"
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
          name: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          brand_id: string | null
          brand_logo: string | null
          brand_name: string | null
          brand_slug: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          datasheet_url: string | null
          description: string | null
          group_code: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          item_type: string | null
          main_vendor: string | null
          max_qty: number | null
          min_qty: number | null
          moq: number | null
          onhand_qty: number | null
          other_code: string | null
          packing: string | null
          reorder_qty: number | null
          search_vector: unknown
          selling_price: number | null
          short_description: string | null
          slug: string | null
          specifications: Json | null
          stock_code: string | null
          stock_status: string | null
          thumbnail_url: string | null
          unit_of_measure: string | null
          updated_at: string | null
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
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

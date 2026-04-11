import { supabase } from "@/integrations/supabase/client";

interface ResendResult {
  success: boolean;
  error?: string;
}

export async function resendCommunication(
  communicationId: string,
  toEmail: string,
  subject: string,
  body: string
): Promise<ResendResult> {
  try {
    // Set status back to pending before retrying
    await supabase
      .from("customer_communications")
      .update({ status: "pending" })
      .eq("id", communicationId);

    const { data, error } = await supabase.functions.invoke("send-order-email", {
      body: { to: toEmail, subject, body, communication_id: communicationId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.success) {
      return { success: true };
    }

    return { success: false, error: data?.error || "Unknown error" };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

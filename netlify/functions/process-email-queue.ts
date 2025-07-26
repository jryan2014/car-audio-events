import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  console.log("Email queue processor triggered at:", new Date().toISOString());
  
  try {
    // Call the Supabase edge function with the cron secret
    const response = await fetch(
      "https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/process-email-queue?cron_secret=n&7i%HgGqyx86MWx@Kgrid5JsL9XAtrzKWEkAYv!^t%SCnEHJD8Q5C2bT!GC",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();
    console.log("Email processing result:", result);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      result: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error processing email queue:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

// This configures the function to run on a schedule
// Runs every 2 minutes
export const config: Config = {
  schedule: "*/2 * * * *",
};
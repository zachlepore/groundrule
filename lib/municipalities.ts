import { createSupabaseServerClient } from "./supabase/server";

export type Municipality = {
  name: string;
  state: string;
};

export async function getMunicipalityBySlug(
  slug: string,
): Promise<Municipality | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .schema("public")
      .from("municipalities")
      .select("name,state")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Supabase municipality query failed.", {
        slug,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    if (!data) {
      console.error("Supabase municipality record was not found.", { slug });
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unable to load municipality from Supabase.", {
      slug,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

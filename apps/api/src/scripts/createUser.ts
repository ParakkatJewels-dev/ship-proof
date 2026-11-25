import { supabase, isMockSupabase } from "../integrations/supabase/db.client.js";

/**
 * Creates a dashboard account in Supabase Auth and sets its role.
 *   npm run user:create -- <email> <password> "<Full name>" [ADMIN|PACKER]
 */
async function main() {
  const [email, password, fullName = "", roleArg = "PACKER"] = process.argv.slice(2);
  const role = roleArg.toUpperCase();

  if (!email || !password || (role !== "ADMIN" && role !== "PACKER")) {
    console.error('Usage: npm run user:create -- <email> <password> "<Full name>" [ADMIN|PACKER]');
    process.exit(1);
  }
  if (isMockSupabase) {
    console.error("Supabase is not configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env). Nothing created.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Use a password of at least 8 characters.");
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email.split("@")[0] },
  });
  if (error || !data.user) {
    console.error(`Could not create the account: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  // Only accounts with a profile can sign in to ShipProof, so this row is what lets the person in.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: data.user.id, full_name: fullName || email.split("@")[0], role });
  if (profileError) {
    console.error(
      `Account created, but the profile could not be saved: ${profileError.message}. Apply supabase/migrations/00005_profiles.sql first.`,
    );
    process.exit(1);
  }
  console.log(`Created ${role} account for ${email}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

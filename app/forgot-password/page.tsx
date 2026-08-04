"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { setResetEmail } from "@/lib/password-reset-flow";
import { useForgotPasswordMutation } from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";

const schema = z.object({ email: z.string().email("Geben Sie eine gültige E-Mail-Adresse ein") });

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <AuthFlowShell
      step={1}
      title="Passwort vergessen?"
      description="Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden einen Einmalcode zur Bestätigung."
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) => {
          try {
            await forgotPassword({ email: values.email.trim() }).unwrap();
            setResetEmail(values.email.trim());
            toast.success("Falls diese E-Mail existiert, wurde ein Bestätigungscode gesendet");
            router.push("/verify-otp");
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Reset-Code konnte nicht gesendet werden"));
          }
        })}
      >
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            E-Mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11 rounded-xl"
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
          {isLoading ? "Wird gesendet…" : "Weiter"}
        </Button>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full rounded-xl")}
        >
          Zurück zur Anmeldung
        </Link>
      </form>
    </AuthFlowShell>
  );
}

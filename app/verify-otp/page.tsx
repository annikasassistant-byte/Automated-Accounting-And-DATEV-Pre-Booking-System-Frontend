"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { getResetEmail, setResetToken } from "@/lib/password-reset-flow";
import { useForgotPasswordMutation, useVerifyOtpMutation } from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { hardNavigate } from "@/lib/hard-navigate";

const schema = z.object({
  otp: z
    .string()
    .length(6, "Geben Sie den 6-stelligen Code ein")
    .regex(/^\d+$/, "Der Code darf nur Zahlen enthalten"),
});

export default function VerifyOtpPage() {
  const [email, setEmail] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useForgotPasswordMutation();

  const {
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    const stored = getResetEmail();
    if (!stored) {
      hardNavigate("/forgot-password");
      return;
    }
    setEmail(stored);
  }, []);

  useEffect(() => {
    const otp = digits.join("");
    setValue("otp", otp, { shouldValidate: otp.length === 6 });
  }, [digits, setValue]);

  const updateDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  if (!email) {
    return (
      <div className="mesh-background flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/20" />
      </div>
    );
  }

  return (
    <AuthFlowShell
      step={2}
      title="Bestätigungscode eingeben"
      description={`Wir haben einen 6-stelligen Code an ${email} gesendet. Geben Sie ihn unten ein, um fortzufahren.`}
    >
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) => {
          try {
            const data = await verifyOtp({ email, otp: values.otp }).unwrap();
            setResetToken(data.resetToken);
            hardNavigate("/reset-password");
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Ungültiger oder abgelaufener Code"));
          }
        })}
      >
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Einmalpasswort
          </Label>
          <div className="flex min-w-0 justify-between gap-1.5 sm:gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <Input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-11 min-h-11 min-w-0 flex-1 rounded-xl px-0 text-center text-lg font-semibold tabular-financial sm:h-14 sm:w-12 sm:flex-none"
                aria-label={`Ziffer ${i + 1}`}
              />
            ))}
          </div>
          {errors.otp && <p className="text-sm text-destructive">{errors.otp.message}</p>}
        </div>

        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
          {isLoading ? "Wird geprüft…" : "Code bestätigen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          disabled={isResending}
          onClick={async () => {
            try {
              await resendOtp({ email }).unwrap();
              toast.success("Ein neuer Code wurde gesendet");
            } catch (error) {
              toast.error(getApiErrorMessage(error, "Code konnte nicht erneut gesendet werden"));
            }
          }}
        >
          {isResending ? "Wird erneut gesendet…" : "Code erneut senden"}
        </Button>
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full rounded-xl")}
        >
          Andere E-Mail verwenden
        </Link>
      </form>
    </AuthFlowShell>
  );
}

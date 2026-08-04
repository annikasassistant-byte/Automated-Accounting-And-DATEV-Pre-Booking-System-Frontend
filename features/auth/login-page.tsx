"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { BrandedLoader } from "@/components/shared/branded-loader";
import { getRedirectForRole, useAuthStore } from "@/lib/auth-store";
import { useLoginMutation } from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Geben Sie eine gültige E-Mail-Adresse ein"),
  password: z.string().min(6, "Passwort ist erforderlich"),
});

type FormValues = z.infer<typeof schema>;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-focus-within:text-primary"
      >
        {label}
      </Label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [login, { isLoading }] = useLoginMutation();
  const [mounted, setMounted] = useState(false);
  /** Keep overlay through navigation — avoids AnimatePresence exit vs router unmount race. */
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isLoading || navigating;

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values).unwrap();
      setSession({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      const mapped = useAuthStore.getState().user;
      const redirect = searchParams.get("redirect");
      const target =
        redirect && redirect.startsWith("/")
          ? redirect
          : mapped
            ? getRedirectForRole(mapped.role)
            : null;

      setNavigating(true);
      toast.success("Willkommen zurück");
      if (target) {
        router.replace(target);
      } else {
        setNavigating(false);
      }
    } catch (error) {
      setNavigating(false);
      toast.error(getApiErrorMessage(error, "Ungültige E-Mail oder Passwort"));
    }
  };

  if (!mounted) {
    return (
      <div className="mesh-background flex min-h-screen items-center justify-center">
        <BrandedLoader className="min-h-0" />
      </div>
    );
  }

  return (
    <div className="mesh-background relative flex min-h-screen flex-col lg:flex-row">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-chart-2/15 blur-3xl" />
      </div>

      {busy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/55 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Anmelden"
        >
          <div className="glass-panel-strong mx-4 flex w-full max-w-xs flex-col items-center rounded-2xl px-8 py-10 shadow-xl shadow-primary/10">
            <BrandedLoader className="min-h-0 gap-5" />
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Sichere Anmeldung läuft…
            </p>
          </div>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative hidden flex-1 flex-col justify-between border-r border-border/40 p-12 lg:flex xl:p-16"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Automated Accounting</span>
        </div>
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Sicheres Auth-Portal
          </div>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-gradient-primary xl:text-5xl">
            Zugang für Admin und Benutzer.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Melden Sie sich an, um Ihr Konto zu verwalten. Passwort-Reset und Profilpflege sind
            integriert.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 Automated Accounting</p>
      </motion.section>

      <div className="relative flex flex-1 items-center justify-center p-4 py-12 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="grid w-full max-w-lg gap-6"
        >
          <div className="mb-2 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <span className="font-semibold">Automated Accounting</span>
          </div>

          <div className="glass-panel-strong rounded-2xl p-6 sm:p-8">
            <div className="mb-8 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Anmelden</h2>
              <p className="text-sm text-muted-foreground">
                Zugang zu Ihrem Benutzer- oder Administrator-Bereich.
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Field id="email" label="E-Mail" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-xl border-border/60 bg-background/60"
                  disabled={busy}
                  {...register("email")}
                />
              </Field>
              <Field id="password" label="Passwort" error={errors.password?.message}>
                <div className="space-y-2">
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    className="h-11 rounded-xl border-border/60 bg-background/60"
                    disabled={busy}
                    {...register("password")}
                  />
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                      tabIndex={busy ? -1 : undefined}
                      aria-disabled={busy}
                    >
                      Passwort vergessen?
                    </Link>
                  </div>
                </div>
              </Field>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-base font-medium shadow-lg shadow-primary/20"
                disabled={busy}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inset-0 rounded-full border-2 border-primary-foreground/25" />
                      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-foreground" />
                    </span>
                    Anmelden…
                  </span>
                ) : (
                  <>
                    Weiter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

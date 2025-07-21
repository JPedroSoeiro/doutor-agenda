"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormMessage } from "@/components/ui/form";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

// Defina o código de administrador esperado a partir da variável de ambiente
// CUIDADO: Esta variável é exposta no lado do cliente!
const EXPECTED_ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE;

// Modifique o schema para incluir o campo adminCode e a validação personalizada
const registerSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Nome é obrigatório" }),
    email: z
      .string()
      .trim()
      .min(1, { message: "E-mail é obrigatório" })
      .email({ message: "E-mail inválido" }),
    password: z
      .string()
      .trim()
      .min(8, { message: "A senha deve ter pelo menos 8 caracteres" }),
    adminCode: z.string().min(1, { message: "Código de acesso é obrigatório" }),
  })
  .refine(
    (data) => {
      if (!EXPECTED_ADMIN_CODE) {
        console.error("NEXT_PUBLIC_ADMIN_CODE não está definido no ambiente.");
        return false;
      }
      return data.adminCode === EXPECTED_ADMIN_CODE;
    },
    {
      message: "Código de acesso incorreto",
      path: ["adminCode"],
    },
  );

const SignUpForm = () => {
  const router = useRouter();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      adminCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    // Se a validação do Zod passou (incluindo a do adminCode), então o onSubmit é chamado
    // Você não precisa revalidar o adminCode aqui, pois o Zod já fez isso.

    await authClient.signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.name,
      },
      {
        onSuccess: () => {
          toast.success("Conta criada com sucesso!"); // Adiciona um toast de sucesso
          router.push("/dashboard");
        },
        onError: (ctx) => {
          if (ctx.error.code === "USER_ALREADY_EXISTS") {
            toast.error("E-mail já cadastrado.");
            return;
          }
          toast.error("Erro ao criar conta.");
        },
      },
    );
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardHeader>
            <div className="mb-3 flex flex-col items-center justify-center text-center">
              <Image
                src="/logo.png"
                alt="Syncli Logo"
                width={200}
                height={60}
              />
            </div>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>Crie uma conta para continuar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Campo E-mail */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu e-mail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Campo Senha */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite sua senha"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* NOVO CAMPO: Código de Acesso do Administrador */}
            <FormField
              control={form.control}
              name="adminCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Acesso</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Insira o código de administrador"
                      type="text" // Use "password" se quiser ocultar o que está sendo digitado
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting} // Desativa o botão enquanto submete
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Criar conta"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SignUpForm;

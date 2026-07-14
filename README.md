# fucrm

CRM da **Fuplastic**.

## Infraestrutura

| Plataforma | Uso |
|---|---|
| **Supabase** | Banco de dados (PostgreSQL) e backend — projeto `fucrm`, região sa-east-1 |
| **Vercel** | Hospedagem e deploy (time FUPLASTIC) |
| **GitHub** | Versionamento (deploy automático via Vercel a cada push) |

## Configuração local

As credenciais ficam em `.env.fuplastic` (**não versionado** — protegido pelo `.gitignore`).
Copie de `.env.example` e preencha com os valores reais:

```bash
cp .env.example .env.fuplastic
```

## Status

Infraestrutura provisionada e integrada. Aplicação a ser desenvolvida.

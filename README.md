This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Build and Deploy

### Build production image
docker build --platform linux/amd64 -t martinhodges/bfp-app:latest .

### Push production image
docker push martinhodges/bfp-app:latest

### Deploy to production
ssh kates 'kubectl rollout restart deployment bfp-app -n bushfire-plan && kubectl rollout status deployment bfp-app -n bushfire-plan -w'

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Headers
When deployed to Kubernetes with ingress-nginx and an OAuth2 proxy, you get the following headers:
```
--- Incoming Request Headers ---
HeadersList {
  cookies: null,
  [Symbol(headers map)]: Map(26) {
    'accept' => { name: 'accept', value: '*/*' },
    'accept-encoding' => { name: 'accept-encoding', value: 'gzip, deflate, br, zstd' },
    'accept-language' => { name: 'accept-language', value: 'en-US,en;q=0.5' },
    'cache-control' => { name: 'cache-control', value: 'no-cache' },
    'cookie' => {
      name: 'cookie',
      value: '_oauth2_proxy=<proxy cookie>'
    },
    'host' => { name: 'host', value: 'bfp.b30.online' },
    'pragma' => { name: 'pragma', value: 'no-cache' },
    'priority' => { name: 'priority', value: 'u=4' },
    'referer' => { name: 'referer', value: 'https://bfp.b30.online/plan/test2' },
    'sec-fetch-dest' => { name: 'sec-fetch-dest', value: 'empty' },
    'sec-fetch-mode' => { name: 'sec-fetch-mode', value: 'cors' },
    'sec-fetch-site' => { name: 'sec-fetch-site', value: 'same-origin' },
    'user-agent' => {
      name: 'user-agent',
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0'
    },
    'x-auth-request-access-token' => {
      name: 'x-auth-request-access-token',
      value: '<access token>;
    },
    'x-auth-request-email' => {
      name: 'x-auth-request-email',
      value: 'martin.hodges@requillion-solutions.com'
    },
    'x-auth-request-preferred-username' => {
      name: 'x-auth-request-preferred-username',
      value: 'martinhodges-bfp'
    },
    'x-auth-request-user' => {
      name: 'x-auth-request-user',
      value: '816949ce-8929-447f-8a48-03eef3393932'
    },
    'x-forwarded-for' => { name: 'x-forwarded-for', value: '10.0.1.1' },
    'x-forwarded-host' => { name: 'x-forwarded-host', value: 'bfp.b30.online' },
    'x-forwarded-port' => { name: 'x-forwarded-port', value: '80' },
    'x-forwarded-proto' => { name: 'x-forwarded-proto', value: 'https' },
    'x-forwarded-scheme' => { name: 'x-forwarded-scheme', value: 'https' },
    'x-original-forwarded-for' => { name: 'x-original-forwarded-for', value: '10.0.1.1' },
    'x-real-ip' => { name: 'x-real-ip', value: '10.0.1.1' },
    'x-request-id' => { name: 'x-request-id', value: '540982020298da99bb49a24a2d89eb37' },
    'x-scheme' => { name: 'x-scheme', value: 'https' }
  },
}

```

## Upgrade of Next.js
Upgrade of Next.js was carried out using:
```bash
npm install next@16.0.7 react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
npx @next/codemod@canary upgrade latest
```
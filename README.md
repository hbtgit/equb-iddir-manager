# Equb & Iddir Manager

A small web app for running Ethiopian community finance groups:

- **Equb (እቁብ)** — rotating savings. Create a group, tick off each member's contribution per round, draw the lot (or choose the winner), and keep a history. Each member receives the pot exactly once per cycle.
- **Iddir (እድር)** — mutual aid fund. Track monthly fees per member, see arrears, record payouts, and watch the fund balance.

English / አማርኛ toggle, light and dark themes, works on phones.

Data is stored in the browser (`localStorage`). Use **Export backup** / **Import backup** on the home page to move or protect it.

## Run

```bash
npm install
npm run dev
```

## Test and build

```bash
npm test
npm run build
```

## Layout

- `src/domain/` — pure rules for equb and iddir, with tests. No UI or storage code.
- `src/store.ts` — state and persistence.
- `src/App.tsx`, `src/EqubPage.tsx`, `src/IddirPage.tsx` — screens.
- `src/i18n.ts` — English and Amharic strings.

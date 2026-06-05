# SyncBook Front

Angular 20 frontend for SyncBook.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [.NET 9 SDK](https://dotnet.microsoft.com/download) for the API backend

## Install

```bash
npm install
```

## Run locally

Start the backend first (in `SyncBook-server`):

```bash
dotnet run
```

Then start the Angular dev server:

```bash
npm start
```

Open `http://localhost:4200`. API calls to `/api/*` are proxied to `http://localhost:5266`.

## Build

```bash
npm run build
```

## Backend

The ASP.NET Core API lives in the sibling repo `SyncBook-server`.

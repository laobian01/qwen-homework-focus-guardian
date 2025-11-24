// Reference to vite/client removed to fix missing type definition error.
// Ensure your tsconfig.json includes "vite/client" in "types" if you need specific Vite types (like import.meta.env).

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    [key: string]: string | undefined;
  }
}

// This file provides Vite type declarations for web-client asset imports.
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleIdConfig = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
};

type GoogleButtonConfig = {
  type?: string;
  theme?: string;
  size?: string;
  text?: string;
  shape?: string;
  width?: number;
  locale?: string;
};

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfig) => void;
        renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void;
      };
    };
  };
}

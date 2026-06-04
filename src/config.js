// Module config — overridden by org settings from database at runtime
export const MODULE_CONFIG = {
  voiceCapture: true,
  approvalFlow: true,
  dataStorage:  true,
  orgManagement: true,
};

export const OPENAI_KEY  = import.meta.env.VITE_OPENAI_KEY  || '';
export const SHEETS_URL  = import.meta.env.VITE_SHEETS_URL  || '';
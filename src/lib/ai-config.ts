/**
 * AI Provider Configuration
 *
 * Supports multiple AI providers with environment-based configuration.
 * Default: xAI (Grok) for backward compatibility.
 *
 * Environment Variables:
 *   AI_PROVIDER        - Provider selection: xai | openai | anthropic | google
 *   AI_MODEL_CONVERSION - Override conversion model (format: model or provider:model)
 *   AI_MODEL_VALIDATION - Override validation model
 *   AI_MODEL_EXPLANATION - Override explanation model
 */

import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import type { LanguageModel } from 'ai';

// Supported providers
export type AIProvider = 'xai' | 'openai' | 'anthropic' | 'google';

// Task types for model routing
export type AITask = 'conversion' | 'validation' | 'explanation';

// Provider factory functions
const providers: Record<AIProvider, (model: string) => LanguageModel> = {
  xai: (model) => xai(model),
  openai: (model) => openai(model),
  anthropic: (model) => anthropic(model),
  google: (model) => google(model),
};

// Default models per provider per task (December 2025 latest)
const MODEL_DEFAULTS: Record<AIProvider, Record<AITask, string>> = {
  xai: {
    conversion: 'grok-4-fast-reasoning',
    validation: 'grok-4-fast-non-reasoning',
    explanation: 'grok-4-fast-non-reasoning',
  },
  openai: {
    conversion: 'gpt-5',
    validation: 'gpt-5-mini',
    explanation: 'gpt-5-mini',
  },
  anthropic: {
    conversion: 'claude-sonnet-4-5-20250514',
    validation: 'claude-sonnet-4-5-20250514',
    explanation: 'claude-3-5-haiku-20241022',
  },
  google: {
    conversion: 'gemini-2.0-flash',
    validation: 'gemini-2.0-flash',
    explanation: 'gemini-2.0-flash',
  },
};

// Default temperatures per task
const TASK_TEMPERATURES: Record<AITask, number> = {
  conversion: 0.2,
  validation: 0.1,
  explanation: 0.7,
};

// API key environment variable mapping
const API_KEY_ENV_VARS: Record<AIProvider, string> = {
  xai: 'XAI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

/**
 * Get current provider from environment
 */
export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER as AIProvider;
  if (provider && Object.keys(providers).includes(provider)) {
    return provider;
  }
  return 'xai'; // Default for backward compatibility
}

/**
 * Check if provider has API key configured
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  return !!process.env[API_KEY_ENV_VARS[provider]];
}

/**
 * Get model for a specific task
 */
export function getModelForTask(task: AITask): {
  model: LanguageModel;
  temperature: number;
  provider: AIProvider;
  modelId: string;
} {
  const provider = getProvider();

  // Allow per-task model override via env
  const envKey = `AI_MODEL_${task.toUpperCase()}`;
  const envValue = process.env[envKey]; // Format: "provider:model" or just "model"

  let modelId: string;
  let actualProvider = provider;

  if (envValue) {
    if (envValue.includes(':')) {
      const [p, m] = envValue.split(':');
      actualProvider = p as AIProvider;
      modelId = m;
    } else {
      modelId = envValue;
    }
  } else {
    modelId = MODEL_DEFAULTS[provider][task];
  }

  const factory = providers[actualProvider];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${actualProvider}`);
  }

  return {
    model: factory(modelId),
    temperature: TASK_TEMPERATURES[task],
    provider: actualProvider,
    modelId,
  };
}

/**
 * Get available providers (for UI/diagnostics)
 */
export function getAvailableProviders(): AIProvider[] {
  return (Object.keys(providers) as AIProvider[]).filter(isProviderAvailable);
}

/**
 * Get all supported models for a provider
 */
export function getModelsForProvider(provider: AIProvider): Record<AITask, string> {
  return MODEL_DEFAULTS[provider];
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): AIProvider[] {
  return Object.keys(providers) as AIProvider[];
}

export const emptySchema = {
  type: 'object',
  required: [],
  properties: {},
  additionalProperties: false
} as const;

const tabProperty = {
  type: 'string',
  description: 'Active tab id from browser_status. Select it first if needed.'
} as const;

export const tabSchema = {
  ...emptySchema,
  required: ['tabId'],
  properties: { tabId: tabProperty }
} as const;

export const screenshotSchema = {
  ...tabSchema,
  properties: {
    ...tabSchema.properties,
    detail: {
      type: 'string',
      enum: ['standard', 'high'],
      description: 'Standard limits the longest edge to 1024 px; high to 2048 px. Default standard.'
    }
  }
} as const;

export const browserOpenSchema = {
  type: 'object',
  required: ['url'],
  properties: {
    url: {
      type: 'string',
      description: 'HTTP, HTTPS, or local file URL or path.'
    },
    tabId: {
      type: 'string',
      description: 'Existing browser tab id from browser_status.'
    },
    newTab: {
      type: 'boolean',
      description: 'Open the URL in a separate browser tab when true.'
    }
  },
  additionalProperties: false
} as const;

export const browserSelectSchema = {
  type: 'object',
  required: ['tabId'],
  properties: {
    tabId: {
      type: 'string',
      description: 'Browser tab id from browser_status.'
    }
  },
  additionalProperties: false
} as const;

export const browserClickSchema = {
  type: 'object',
  required: ['tabId', 'ref'],
  properties: {
    tabId: tabProperty,
    ref: {
      type: 'string',
      description: 'Element ref returned by the latest browser_snapshot.'
    }
  },
  additionalProperties: false
} as const;

export const browserTypeSchema = {
  type: 'object',
  required: ['tabId', 'ref', 'text'],
  properties: {
    tabId: tabProperty,
    ref: {
      type: 'string',
      description: 'Input element ref returned by the latest browser_snapshot.'
    },
    text: {
      type: 'string',
      description: 'Text to enter.'
    },
    clear: {
      type: 'boolean',
      description: 'Replace existing text when true.'
    }
  },
  additionalProperties: false
} as const;

export const browserScrollSchema = {
  type: 'object',
  required: ['tabId', 'direction'],
  properties: {
    tabId: tabProperty,
    direction: {
      enum: ['up', 'down', 'left', 'right'],
      type: 'string',
      description: 'Scroll direction for the page or the scrollable area at the viewport center.'
    },
    amount: {
      type: 'number',
      description: 'Scroll distance in pixels. Defaults to 600.'
    }
  },
  additionalProperties: false
} as const;

export const browserViewportSchema = {
  type: 'object',
  required: ['tabId'],
  properties: {
    tabId: tabProperty,
    width: {
      type: 'number',
      description: 'Emulated viewport width in CSS pixels, between 240 and 4000.'
    },
    height: {
      type: 'number',
      description: 'Emulated viewport height in CSS pixels. Defaults to 900.'
    },
    reset: {
      type: 'boolean',
      description: 'Restore the real panel viewport when true.'
    }
  },
  additionalProperties: false
} as const;

export const browserPressSchema = {
  type: 'object',
  required: ['tabId', 'key'],
  properties: {
    tabId: tabProperty,
    key: {
      type: 'string',
      description: 'One key such as Enter, Tab, Escape, or ArrowDown, optionally with cmd, ctrl, alt, or shift.'
    }
  },
  additionalProperties: false
} as const;

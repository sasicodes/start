import * as v from 'valibot';

const footnoteProperties = ['dataFootnotes', 'data-footnotes', 'dataFootnoteRef', 'data-footnote-ref'] as const;
const propertySchema = v.record(v.string(), v.unknown());

export const hasFootnoteProperty = (properties: unknown) => {
  const result = v.safeParse(propertySchema, properties);
  return result.success && footnoteProperties.some((property) => property in result.output);
};

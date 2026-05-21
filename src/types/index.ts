export type Language = 'pt' | 'en';

export interface FeatureData {
  eyebrowPt: string;
  eyebrowEn: string;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  tagsPt: string[];
  tagsEn: string[];
  image: string;
  imageAlt: string;
}

export interface TestimonialData {
  name: string;
  durationPt: string;
  durationEn: string;
  quotePt: string;
  quoteEn: string;
  resultPt: string;
  resultEn: string;
}

export interface PricingPlan {
  id: string;
  namePt: string;
  nameEn: string;
  descriptionPt: string;
  descriptionEn: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyEquiv: string;
  featuresPt: string[];
  featuresEn: string[];
  highlighted?: boolean;
}

export interface FAQItem {
  questionPt: string;
  questionEn: string;
  answerPt: string;
  answerEn: string;
}

export interface StatData {
  value: string;
  numericValue: number;
  labelPt: string;
  labelEn: string;
  hasStars?: boolean;
  prefix?: string;
  suffix?: string;
}

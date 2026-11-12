import crypto from 'crypto';

export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const combineLandData = (
  parcelId: string,
  location: string,
  area: number,
  documentHash: string
): string => {
  const combined = `${parcelId}|${location}|${area}|${documentHash}|${Date.now()}`;
  return hashData(combined);
};

export const verifySHA256 = (data: string, hash: string): boolean => {
  return hashData(data) === hash;
};

export const encodeDataForBlockchain = (data: Record<string, any>): string => {
  return hashData(JSON.stringify(data));
};

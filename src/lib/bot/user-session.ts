/**
 * User session store to track last viewed product per user for quantity text input.
 */

const userLastProduct = new Map<number, string>();

export function setUserLastProduct(userId: number, productId: string) {
  userLastProduct.set(userId, productId);
}

export function getUserLastProduct(userId: number): string | undefined {
  return userLastProduct.get(userId);
}

const { initUrl, completeUrl, BASE_URL } = require('../endpoints');

describe('endpoints', () => {
  it('should build the init url then include the encoded key', () => {
    expect(initUrl('rzp_test_a b')).toBe(`${BASE_URL}/magic/shopify/init?key_id=rzp_test_a%20b`);
  });

  const completeCases = {
    'should use the monolith route then return 1cc path when the experiment is absent': [
      undefined,
      `${BASE_URL}/1cc/shopify/complete?key_id=k`,
    ],
    'should use the monolith route then return 1cc path when the variant is off': [
      { shopify_pre_payment_guardrail: 'variant_off' },
      `${BASE_URL}/1cc/shopify/complete?key_id=k`,
    ],
    'should use the MCS route then return checkouts path when the variant is on': [
      { shopify_pre_payment_guardrail: 'variant_on' },
      `${BASE_URL}/checkouts/shopify/complete?key_id=k`,
    ],
  };

  Object.entries(completeCases).forEach(([name, [experiments, expected]]) => {
    it(name, () => expect(completeUrl('k', experiments)).toBe(expected));
  });
});

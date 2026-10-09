'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartContext';
import { createClient } from '@/lib/supabase/client';

const CURRENCY = 'USD';

const PAYPAL_ENV =
process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live'
? 'live'
: 'sandbox';

const PAYPAL_SDK_URL =
PAYPAL_ENV === 'live'
? 'https://www.paypal.com/sdk/js'
: 'https://www.sandbox.paypal.com/sdk/js';

const COUNTRY_CODES = (
'AD AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ ' +
'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK ' +
'FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT ' +
'JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML ' +
'MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM ' +
'PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD ' +
'TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

const regionNames = new Intl.DisplayNames(['en'], {
type: 'region',
});

const COUNTRIES = [
{
code: 'AE',
name: 'United Arab Emirates',
},
...COUNTRY_CODES
.filter((code) => code !== 'AE')
.map((code) => ({
code,
name: regionNames.of(code) || code,
}))
.sort((a, b) =>
a.name.localeCompare(b.name)
),
];

const EMIRATES = [
'Abu Dhabi',
'Dubai',
'Sharjah',
'Ajman',
'Umm Al Quwain',
'Ras Al Khaimah',
'Fujairah',
];

async function getAccessToken() {
try {
const supabase = createClient();


const {
  data: { session },
  error,
} = await supabase.auth.getSession();

if (error) {
  console.error(
    'Supabase session error:',
    error
  );

  return null;
}

return session?.access_token || null;


} catch (error) {
console.error(
'Unable to get Supabase access token:',
error
);


return null;


}
}

function deliveryPayload(address) {
const parts = [
address.line1,
address.line2,
address.city,
address.emirate,
address.postalCode,
address.country,
]
.filter(
(value) =>
typeof value === 'string' &&
value.trim().length > 0
)
.map((value) => value.trim());

return {
address: parts.join(', '),
countryCode: address.countryCode,
notes: address.notes?.trim() || '',
};
}

async function parseResponse(response) {
const contentType =
response.headers.get('content-type') || '';

if (
contentType.includes(
'application/json'
)
) {
return response.json();
}

const text = await response.text();

return {
error:
text ||
`Request failed with status ${response.status}.`,
};
}

function isNonEmpty(value) {
return (
String(value || '').trim().length > 0
);
}

export default function CheckoutClient({
user,
}) {
const { items, subtotal } = useCart();

const router = useRouter();

const savedAddress =
user?.user_metadata?.address || {};

const [method, setMethod] =
useState('paypal');

const [address, setAddress] = useState({
fullName:
user?.user_metadata?.full_name || '',


phone:
  savedAddress.phone || '',

countryCode:
  savedAddress.countryCode || 'AE',

country:
  savedAddress.country ||
  'United Arab Emirates',

line1:
  savedAddress.line1 || '',

line2:
  savedAddress.line2 || '',

city:
  savedAddress.city || '',

emirate:
  savedAddress.emirate || '',

postalCode:
  savedAddress.postalCode || '',

notes: '',


});

const [addressValid, setAddressValid] =
useState(false);

const [codSubmitting, setCodSubmitting] =
useState(false);

const [
walkinSubmitting,
setWalkinSubmitting,
] = useState(false);

const [error, setError] =
useState('');

const paypalRef = useRef(null);

const paypalButtonsRef =
useRef(null);

const paypalRenderingRef =
useRef(false);

const latest = useRef({
items: [],
address: {},
});

latest.current = {
items,
address,
};

const isUAE =
address.countryCode === 'AE';

function setField(key, value) {
setAddress((current) => ({
...current,
[key]: value,
}));


setError('');


}

function handleCountryChange(code) {
const selectedCountry =
COUNTRIES.find(
(country) =>
country.code === code
);


setAddress((current) => ({
  ...current,
  countryCode: code,
  country:
    selectedCountry?.name || code,
  emirate: '',
}));

setError('');


}

useEffect(() => {
const filled = (key) =>
isNonEmpty(address[key]);


let valid = false;

if (method === 'walkin') {
  valid =
    filled('fullName') &&
    filled('phone');
} else {
  valid =
    filled('fullName') &&
    filled('phone') &&
    filled('line1') &&
    filled('city') &&
    filled('countryCode') &&
    (
      address.countryCode !== 'AE' ||
      filled('emirate')
    );
}

setAddressValid(valid);


}, [address, method]);

function cleanupPayPalButtons() {
try {
if (
paypalButtonsRef.current &&
typeof paypalButtonsRef.current
.close === 'function'
) {
paypalButtonsRef.current.close();
}
} catch (error) {
console.warn(
'Unable to close PayPal buttons:',
error
);
}


paypalButtonsRef.current = null;

paypalRenderingRef.current = false;

if (paypalRef.current) {
  paypalRef.current.innerHTML = '';
}


}

useEffect(() => {
if (
method !== 'paypal' ||
!addressValid ||
items.length === 0
) {
cleanupPayPalButtons();
return;
}


if (
  paypalButtonsRef.current ||
  paypalRenderingRef.current
) {
  return;
}

const clientId =
  process.env
    .NEXT_PUBLIC_PAYPAL_CLIENT_ID;

if (!clientId) {
  setError(
    'PayPal is not configured. NEXT_PUBLIC_PAYPAL_CLIENT_ID is missing.'
  );

  return;
}

let cancelled = false;

const renderButtons = async () => {
  if (cancelled) {
    return;
  }

  if (
    !window.paypal ||
    !paypalRef.current ||
    paypalButtonsRef.current ||
    paypalRenderingRef.current
  ) {
    return;
  }

  paypalRenderingRef.current = true;

  try {
    const buttons =
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          shape: 'rect',
          label: 'paypal',
        },

        createOrder: async () => {
          const {
            items: currentItems,
            address: currentAddress,
          } = latest.current;

          if (!currentItems.length) {
            throw new Error(
              'Your cart is empty.'
            );
          }

          const token =
            await getAccessToken();

          const response =
            await fetch(
              '/api/paypal/create-order',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
                },

                body: JSON.stringify({
                  items: currentItems,

                  currency:
                    CURRENCY,

                  delivery:
                    deliveryPayload(
                      currentAddress
                    ),
                }),
              }
            );

          const data =
            await parseResponse(
              response
            );

          if (!response.ok) {
            throw new Error(
              data.error ||
                'Could not start PayPal checkout.'
            );
          }

          if (!data.id) {
            throw new Error(
              'PayPal did not return an order ID.'
            );
          }

          return data.id;
        },

        onApprove: async (data) => {
          try {
            if (!data?.orderID) {
              throw new Error(
                'PayPal did not return a valid order ID.'
              );
            }

            const {
              items: currentItems,
              address: currentAddress,
            } = latest.current;

            const token =
              await getAccessToken();

            const response =
              await fetch(
                '/api/paypal/capture-order',
                {
                  method: 'POST',

                  headers: {
                    'Content-Type':
                      'application/json',

                    ...(token
                      ? {
                          Authorization:
                            `Bearer ${token}`,
                        }
                      : {}),
                  },

                  body: JSON.stringify({
                    orderID:
                      data.orderID,

                    items:
                      currentItems,

                    address:
                      currentAddress,
                  }),
                }
              );

            const result =
              await parseResponse(
                response
              );

            if (!response.ok) {
              throw new Error(
                result.error ||
                  'Payment could not be captured.'
              );
            }

            if (!result.orderId) {
              throw new Error(
                'Payment completed, but no order ID was returned.'
              );
            }

            router.push(
              `/order/success?order=${encodeURIComponent(
                result.orderId
              )}`
            );
          } catch (
            approveError
          ) {
            console.error(
              'PayPal capture error:',
              approveError
            );

            setError(
              approveError?.message ||
                'Payment could not be completed.'
            );
          }
        },

        onCancel: () => {
          setError(
            'PayPal checkout was cancelled.'
          );
        },

        onError: (
          paypalError
        ) => {
          console.error(
            'PayPal checkout error:',
            paypalError
          );

          setError(
            paypalError?.message ||
              'PayPal checkout hit an error. Please try again.'
          );

          cleanupPayPalButtons();
        },
      });

    if (cancelled) {
      return;
    }

    paypalButtonsRef.current =
      buttons;

    await buttons.render(
      paypalRef.current
    );
  } catch (renderError) {
    console.error(
      'PayPal render error:',
      renderError
    );

    paypalButtonsRef.current =
      null;

    if (!cancelled) {
      setError(
        renderError?.message ||
          'Unable to load PayPal checkout.'
      );
    }
  } finally {
    paypalRenderingRef.current =
      false;
  }
};

let script =
  document.querySelector(
    'script[data-stitchhouse-paypal]'
  );

if (script) {
  if (window.paypal) {
    renderButtons();
  } else {
    script.addEventListener(
      'load',
      renderButtons
    );
  }
} else {
  script =
    document.createElement(
      'script'
    );

  script.src =
    `${PAYPAL_SDK_URL}?client-id=${encodeURIComponent(
      clientId
    )}&currency=${CURRENCY}&intent=capture`;

  script.async = true;

  script.dataset.stitchhousePaypal =
    'true';

  script.onload =
    renderButtons;

  script.onerror = () => {
    if (!cancelled) {
      setError(
        'Unable to load PayPal. Check your PayPal environment and client ID.'
      );
    }

    paypalRenderingRef.current =
      false;
  };

  document.body.appendChild(
    script
  );
}

return () => {
  cancelled = true;

  script?.removeEventListener(
    'load',
    renderButtons
  );

  cleanupPayPalButtons();
};


}, [
method,
addressValid,
items.length,
router,
]);

function selectMethod(nextMethod) {
setError('');


if (nextMethod === method) {
  return;
}

if (method === 'paypal') {
  cleanupPayPalButtons();
}

setMethod(nextMethod);


}

async function handleCodSubmit() {
if (!addressValid) {
setError(
'Please complete the shipping address first.'
);


  return;
}

if (!items.length) {
  setError(
    'Your cart is empty.'
  );

  return;
}

if (codSubmitting) {
  return;
}

setCodSubmitting(true);

setError('');

try {
  const response =
    await fetch(
      '/api/orders/cod',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          items,

          address,

          delivery:
            deliveryPayload(
              address
            ),
        }),
      }
    );

  const result =
    await parseResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      result.error ||
        'Could not place order.'
    );
  }

  if (!result.orderId) {
    throw new Error(
      'Order was created but no order ID was returned.'
    );
  }

  router.push(
    `/order/success?order=${encodeURIComponent(
      result.orderId
    )}`
  );
} catch (submitError) {
  console.error(
    'COD order error:',
    submitError
  );

  setError(
    submitError?.message ||
      'Could not place order.'
  );
} finally {
  setCodSubmitting(false);
}


}

async function handleWalkinSubmit() {
if (!addressValid) {
setError(
'Please enter your name and phone number first.'
);


  return;
}

if (!items.length) {
  setError(
    'Your cart is empty.'
  );

  return;
}

if (walkinSubmitting) {
  return;
}

setWalkinSubmitting(true);

setError('');

try {
  const response =
    await fetch(
      '/api/orders/walkin',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          items,

          contact: {
            fullName:
              address.fullName,

            phone:
              address.phone,
          },
        }),
      }
    );

  const result =
    await parseResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      result.error ||
        'Could not place order.'
    );
  }

  if (!result.orderId) {
    throw new Error(
      'Order was created but no order ID was returned.'
    );
  }

  router.push(
    `/order/success?order=${encodeURIComponent(
      result.orderId
    )}`
  );
} catch (submitError) {
  console.error(
    'Walk-in order error:',
    submitError
  );

  setError(
    submitError?.message ||
      'Could not place order.'
  );
} finally {
  setWalkinSubmitting(false);
}


}

if (items.length === 0) {
return ( <div className="max-w-xl mx-auto px-5 py-24 text-center"> <h1 className="font-display text-3xl text-thread mb-4">
Your cart is empty </h1>


    <p className="text-thread/60">
      Add something from the shop before
      checking out.
    </p>
  </div>
);


}

return ( <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12"> <div> <h1 className="font-display text-3xl text-thread mb-8">
Checkout </h1>


    <h2 className="text-xs uppercase tracking-widest text-gold mb-4">
      {method === 'walkin'
        ? 'Pickup details'
        : 'Shipping address'}
    </h2>

    <div className="space-y-4 mb-10">
      <Field
        label="Full name"
        value={address.fullName}
        onChange={(value) =>
          setField(
            'fullName',
            value
          )
        }
      />

      <Field
        label="Phone"
        value={address.phone}
        onChange={(value) =>
          setField(
            'phone',
            value
          )
        }
      />

      {method !== 'walkin' && (
        <>
          <Select
            label="Country"
            value={
              address.countryCode
            }
            onChange={
              handleCountryChange
            }
            options={COUNTRIES.map(
              (country) => ({
                value:
                  country.code,

                label:
                  country.name,
              })
            )}
          />

          <Field
            label="Address"
            value={
              address.line1
            }
            onChange={(value) =>
              setField(
                'line1',
                value
              )
            }
          />

          <Field
            label="Building / Apartment / Landmark"
            optional
            value={
              address.line2
            }
            onChange={(value) =>
              setField(
                'line2',
                value
              )
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="City"
              value={
                address.city
              }
              onChange={(value) =>
                setField(
                  'city',
                  value
                )
              }
            />

            {isUAE ? (
              <Select
                label="Emirate"
                value={
                  address.emirate
                }
                onChange={(
                  value
                ) =>
                  setField(
                    'emirate',
                    value
                  )
                }
                placeholder="Select emirate"
                options={EMIRATES.map(
                  (
                    emirate
                  ) => ({
                    value:
                      emirate,

                    label:
                      emirate,
                  })
                )}
              />
            ) : (
              <Field
                label="State / Province"
                optional
                value={
                  address.emirate
                }
                onChange={(
                  value
                ) =>
                  setField(
                    'emirate',
                    value
                  )
                }
              />
            )}
          </div>

          {!isUAE && (
            <Field
              label="Postal code"
              optional
              value={
                address.postalCode
              }
              onChange={(
                value
              ) =>
                setField(
                  'postalCode',
                  value
                )
              }
            />
          )}

          <div>
            <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
              Delivery notes{' '}
              <span className="normal-case tracking-normal text-thread/30">
                (optional)
              </span>
            </label>

            <textarea
              rows={3}
              value={
                address.notes
              }
              onChange={(
                event
              ) =>
                setField(
                  'notes',
                  event.target
                    .value
                )
              }
              className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold resize-none"
            />
          </div>
        </>
      )}

      {method === 'walkin' && (
        <p className="text-thread/40 text-xs leading-relaxed">
          No delivery address is
          needed. You will pick up
          and pay for this order in
          person at our shop.
        </p>
      )}
    </div>

    <h2 className="text-xs uppercase tracking-widest text-gold mb-4">
      Payment method
    </h2>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <PaymentButton
        active={
          method === 'paypal'
        }
        onClick={() =>
          selectMethod(
            'paypal'
          )
        }
      >
        PayPal
      </PaymentButton>

      <PaymentButton
        active={
          method === 'cod'
        }
        onClick={() =>
          selectMethod('cod')
        }
      >
        Cash on Delivery
      </PaymentButton>

      <PaymentButton
        active={
          method === 'walkin'
        }
        onClick={() =>
          selectMethod(
            'walkin'
          )
        }
      >
        Walk-in
      </PaymentButton>
    </div>

    {!addressValid && (
      <p className="text-thread/40 text-sm mb-4">
        {method === 'walkin'
          ? 'Fill in your name and phone number above to continue.'
          : 'Fill in the shipping address above to continue.'}
      </p>
    )}

    {addressValid &&
      method === 'paypal' && (
        <div
          ref={paypalRef}
          className="min-h-[45px] w-full"
        />
      )}

    {addressValid &&
      method === 'cod' && (
        <button
          type="button"
          onClick={
            handleCodSubmit
          }
          disabled={
            codSubmitting
          }
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {codSubmitting
            ? 'Placing order...'
            : 'Place Order — Pay on Delivery'}
        </button>
      )}

    {addressValid &&
      method === 'walkin' && (
        <button
          type="button"
          onClick={
            handleWalkinSubmit
          }
          disabled={
            walkinSubmitting
          }
          className="w-full bg-gold text-ink font-body uppercase tracking-widest text-sm px-8 py-3.5 rounded-sm hover:bg-thread transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {walkinSubmitting
            ? 'Placing order...'
            : 'Place Order — Pay at Pickup'}
        </button>
      )}

    {error && (
      <div className="mt-4 border border-stitchRed/30 bg-stitchRed/5 rounded-sm px-4 py-3">
        <p className="text-stitchRed text-sm leading-relaxed">
          {error}
        </p>
      </div>
    )}
  </div>

  <div>
    <h2 className="text-xs uppercase tracking-widest text-gold mb-4">
      Order summary
    </h2>

    <div className="divide-y divide-white/10">
      {items.map((item) => {
        const price =
          Number(
            item.price || 0
          );

        const quantity =
          Number(
            item.qty || 0
          );

        const lineTotal =
          price * quantity;

        return (
          <div
            key={item.key}
            className="flex justify-between py-3 text-sm gap-4"
          >
            <div className="text-thread/80 min-w-0">
              <div>
                {item.name}

                <span
                  className={`ml-2 text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 align-middle ${
                    item.type ===
                    'custom'
                      ? 'border-gold text-gold'
                      : 'border-white/20 text-thread/50'
                  }`}
                >
                  {item.type ===
                  'custom'
                    ? 'Custom'
                    : 'Plain'}
                </span>

                {item.size &&
                  ` (${item.size})`}{' '}
                × {item.qty}
              </div>

              {item.type ===
                'custom' &&
                item.note && (
                  <div className="text-thread/50 text-xs mt-1 leading-relaxed">
                    <span className="font-mono uppercase tracking-widest text-thread/40">
                      Design note:
                    </span>{' '}
                    {item.note}
                  </div>
                )}

              {item.type ===
                'custom' &&
                item.design && (
                  <div className="text-thread/50 text-xs mt-1 leading-relaxed">
                    <span className="font-mono uppercase tracking-widest text-thread/40">
                      Design file:
                    </span>{' '}
                    {item.design.name}
                  </div>
                )}
            </div>

            <span className="font-mono text-thread flex-shrink-0">
              $
              {lineTotal.toFixed(
                2
              )}
            </span>
          </div>
        );
      })}
    </div>

    <div className="flex justify-between pt-4 mt-2 border-t border-white/10">
      <span className="font-display text-lg text-thread">
        Total
      </span>

      <span className="font-mono text-lg text-thread">
        $
        {Number(
          subtotal || 0
        ).toFixed(2)}{' '}
        {CURRENCY}
      </span>
    </div>
  </div>
</div>


);
}

function PaymentButton({
active,
onClick,
children,
}) {
return (
<button
type="button"
onClick={onClick}
className={`border rounded-sm py-3 text-sm uppercase tracking-widest transition-colors ${
        active
          ? 'border-gold text-gold'
          : 'border-white/20 text-thread/60 hover:border-white/40'
      }`}
>
{children} </button>
);
}

function Field({
label,
value,
onChange,
optional = false,
}) {
return ( <div> <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
{label}


    {optional && (
      <span className="normal-case tracking-normal text-thread/30">
        {' '}
        (optional)
      </span>
    )}
  </label>

  <input
    type="text"
    value={value || ''}
    onChange={(event) =>
      onChange(
        event.target.value
      )
    }
    className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
  />
</div>


);
}

function Select({
label,
value,
onChange,
options,
placeholder,
}) {
return ( <div> <label className="block text-xs uppercase tracking-widest text-thread/50 mb-2">
{label} </label>

  <select
    value={value || ''}
    onChange={(event) =>
      onChange(
        event.target.value
      )
    }
    className="w-full bg-canvas2 border border-white/15 rounded-sm px-4 py-3 text-thread focus-visible:outline-gold"
  >
    {placeholder && (
      <option
        value=""
        disabled
      >
        {placeholder}
      </option>
    )}

    {options.map(
      (option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      )
    )}
  </select>
</div>


);
}

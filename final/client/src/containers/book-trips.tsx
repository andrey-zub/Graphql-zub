import React, { useState } from 'react';
import { useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import Button from '../components/button';
import { GET_LAUNCH } from './cart-item';
import * as GetCartItemsTypes from '../pages/__generated__/GetCartItems';
import * as BookTripsTypes from './__generated__/BookTrips';

import { StripeCardElement } from '@stripe/stripe-js';
import {useStripe, useElements, CardElement} from '@stripe/react-stripe-js';

export const BOOK_TRIPS = gql`
  mutation BookTrips($launchIds: [ID]!, $cardToken: String) {
    bookTrips(launchIds: $launchIds, cardToken: $cardToken) {
      success
      message
      launches {
        id
        isBooked
      }
    }
  }
`;

interface BookTripsProps extends GetCartItemsTypes.GetCartItems {}

const BookTrips: React.FC<BookTripsProps> = ({ cartItems }) => {
  const [ loading, setLoading ] = useState(false);

  const [bookTrips, { data }] = useMutation<BookTripsTypes.BookTrips, BookTripsTypes.BookTripsVariables>(
    BOOK_TRIPS,
    {
     // variables: { launchIds: cartItems },
      refetchQueries: cartItems.map(launchId => ({
        query: GET_LAUNCH,
        variables: { launchId },
      })),
      update(cache) {
        cache.writeData({ data: { cartItems: [] } });
      }
    }
  );

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);

    if (stripe && elements) {
      try {
        const result = await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement) as StripeCardElement,
          billing_details: {
            // Include any additional collected billing details.
            name: 'Jenny Rosen',
          },
        }); 

        if (!result?.paymentMethod?.id) {
          throw new Error('Invalid token'); 
        }

        await bookTrips({variables: {launchIds: cartItems, cardToken: result?.paymentMethod?.id } as any })

      } catch (e) {
        setLoading(false);
        alert(e.message)
      }
    }
  };

  return data && data.bookTrips && !data.bookTrips.success
    ? <p data-testid="message">{data.bookTrips.message}</p>
    : (

    <form onSubmit={handleSubmit}>
      <CardElement />
      <Button 
        type="submit"
        data-testid="book-button"
        disabled={loading}>
        {loading ? 'Loading...' : 'Book All'}
      </Button>
    </form>
    );
}

export default BookTrips;
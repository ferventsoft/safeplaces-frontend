import { useSelector } from 'react-redux';

export const CounterComponent = () => {
  const counter = useSelector(state => state);
  return counter;
};

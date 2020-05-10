import {
  GENERATE_WARNINGS,
  CLEAR_ALL,
  CLEAR_COMPLETED,
} from '../constants/ActionTypes';
// import calculateWarnings from "../helpers/calculateWarnings";

const initialState = [];

export default function todos(state = initialState, action) {
  switch (action.type) {
    case GENERATE_WARNINGS:
      return action.data;
    case CLEAR_COMPLETED:
      return state.filter(todo => todo.completed === false);

    case CLEAR_ALL:
      return initialState;

    default:
      return state;
  }
}

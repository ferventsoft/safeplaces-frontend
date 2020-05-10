import { ADD_SELECTED_ENTRY } from '../constants/ActionTypes';

const initialState = [];

export default function todos(state = initialState, action) {
  switch (action.type) {
    case ADD_SELECTED_ENTRY:
      return action.data;
    default:
      return state;
  }
}

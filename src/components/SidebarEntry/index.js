import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { deleteTrackEntry } from '../../ducks/tracks';

import { addSelected } from '../../actions';
import { getSelectedTracks, getFilteredTrackPath } from '../../selectors';
import { Button, Checkbox, List, ListItem } from '@wfp/ui';
import styles from './styles.module.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashAlt,
  faMapMarkerQuestion,
  faEdit,
} from '@fortawesome/pro-solid-svg-icons';
import moment from 'moment';
import Empty from '../Empty';
import { NavLink } from 'react-router-dom';

export default function SidebarContent() {
  const selectedTracks = useSelector(state => getSelectedTracks(state));
  const filteredTrackPath = useSelector(state => getFilteredTrackPath(state));

  const dispatch = useDispatch();
  const addSelectedTrigger = data => dispatch(addSelected(data));
  const deleteTrackEntryTrigger = data => dispatch(deleteTrackEntry(data));

  return (
    <>
      {!filteredTrackPath && (
        <Empty
          title="No file opened"
          className="attendance-detail-empt"
          kind="large"
          icon={<FontAwesomeIcon icon={faMapMarkerQuestion} size="1x" />}
        >
          Please open a file
        </Empty>
      )}
      {filteredTrackPath &&
        filteredTrackPath.map((e, i) => (
          <div
            className={`${styles.item} ${
              selectedTracks.includes(e[0]) && styles.selectedItem
            }`}
            key={i}
          >
            <Checkbox
              wrapperClassName={styles.checkbox}
              name={`checkbox-${e[0]}`}
              onChange={f => {
                if (f === false) {
                  const newSelect = selectedTracks;
                  newSelect.splice(newSelect.indexOf(e[0]), 1);
                  addSelectedTrigger([...newSelect]);
                } else {
                  addSelectedTrigger([...selectedTracks, e[0]]);
                }
              }}
              checked={selectedTracks.includes(e[0])}
            />
            <div
              className={styles.itemInner}
              onClick={() => addSelectedTrigger([e[0]])}
            >
              <div>
                <h3 className={styles.title}>
                  {moment.utc(e[1].time).format('YYYY-MM-DD')}
                  <span className={styles.time}>
                    {moment.utc(e[1].time).format('HH:mm:ss')}
                  </span>
                </h3>

                <p className={styles.subTitle}>
                  {e[1].street} {e[1].other} {e[1].postal} {e[1].town}
                </p>

                <List kind="simple" colon small>
                  <ListItem title="Latitude">{e[1].latitude}</ListItem>
                  <ListItem title="Longitude">{e[1].longitude}</ListItem>
                </List>
              </div>

              <div className={styles.buttons}>
                <NavLink to={`/patient/edit/${e[0]}`}>
                  <Button
                    kind="primary"
                    icon={<FontAwesomeIcon icon={faEdit} />}
                  ></Button>
                </NavLink>
                <Button
                  kind="primary"
                  icon={<FontAwesomeIcon icon={faTrashAlt} />}
                  onClick={() => deleteTrackEntryTrigger(e[1].time)}
                ></Button>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

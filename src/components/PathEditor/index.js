import React, { useState } from 'react';
import Map from '../Map';
import Sidebar from '../Sidebar';
import Wrapper from '../Wrapper';
import EntryForm from '../EntryForm';
import { useSelector } from 'react-redux';
import { getSelectedPointsData } from 'selectors/selectedPoints';
import MapComponent from 'components/olMap';

export default function PathEditor({ match }) {
  const [map, setMap] = useState(null);
  const selectedPointsData = useSelector(getSelectedPointsData);
  const updateMap = map => {
    setMap(map);
  };

  return (
    <Wrapper
      editor={
        <EntryForm initialData={selectedPointsData && selectedPointsData[0]} />
      }
      sidebar={<Sidebar map={map} />}
    >
      <MapComponent
        currentPointId={match.params === undefined ? '' : match.params.action}
        currentEntryId={match.params === undefined ? '' : match.params.patient}
        setMap={map => {
          updateMap(map);
        }}
      />
    </Wrapper>
  );
}

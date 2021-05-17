/*
 * This file is part of React-SearchKit.
 * Copyright (C) 2019 CERN.
 *
 * React-SearchKit is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */

import React, { Component } from 'react';
import {
  Container,
  Grid,
  Card,
  Image,
  Item,
} from 'semantic-ui-react';
import _truncate from 'lodash/truncate';
import { OverridableContext } from 'react-overridable';
import {
  BucketAggregation,
  ReactSearchKit,
  SearchBar,
  EmptyResults,
  Error,
  ResultsLoader,
  withState,
} from '../../lib/components';
import { Results } from './Results';
import { DemoESRequestSerializer } from './DemoESRequestSerializer';
import { ESSearchApi } from '../../lib/api/contrib/elasticsearch';

const OnResults = withState(Results);

const searchApi = new ESSearchApi({
  axios: {
    // url: 'http://localhost:5000/random/_search',
    url: 'http://localhost:9200/plone2020/_search',
    timeout: 5000,
  },
  es: {
    requestSerializer: DemoESRequestSerializer,
  },
});

const initialState = {
  layout: 'list',
  page: 1,
  size: 10,
};

const ElasticSearchResultsListItem = ({ result, index }) => {
  // console.log('result', result);
  return (
    <Item key={index} href={`#`}>
      <Item.Content>
        <Item.Header>
          {result.title}
        </Item.Header>
        <Item.Extra>
          informationtype: {result.informationtype?.map((el) => el.title).join(', ')}
        </Item.Extra>
        <Item.Extra>
          kompasscomponent: {result.kompasscomponent?.map((el) => el.title).join(', ')}
        </Item.Extra>
        <Item.Extra>
          free tags: {result.freemanualtags?.join(', ')}
        </Item.Extra>
      </Item.Content>
    </Item>
  );
};

const ElasticSearchResultsGridItem = ({ result, index }) => {
  return (
    <Card fluid key={index} href={`#`}>
      <Image src={result.picture || 'http://placehold.it/200'} />
      <Card.Content>
        <Card.Header>
          {result.first_name} {result.last_name}
        </Card.Header>
        <Card.Description>
          {_truncate(result.about, { length: 200 })}
        </Card.Description>
      </Card.Content>
    </Card>
  );
};

const overriddenComponents = {
  'ResultsList.item.elasticsearch': ElasticSearchResultsListItem,
  'ResultsGrid.item.elasticsearch': ElasticSearchResultsGridItem,
};

export class App extends Component {
  render() {
    return (
      <OverridableContext.Provider value={overriddenComponents}>
        <ReactSearchKit searchApi={searchApi} initialQueryState={initialState}>
          <Container>
            <Grid>
              <Grid.Row>
                <Grid.Column width={3} />
                <Grid.Column width={10}>
                  <SearchBar />
                </Grid.Column>
                <Grid.Column width={3} />
              </Grid.Row>
            </Grid>
            <Grid relaxed style={{ padding: '2em 0' }}>
              <Grid.Row columns={2}>
                <Grid.Column width={4}>
                  <BucketAggregation
                    title="Komponenten"
                    agg={{
                      field: 'kompasscomponent',
                      aggName: 'kompasscomponent_agg.inner.kompasscomponent_token',
                    }}
                  />
                  <BucketAggregation
                    title="Informationstyp"
                    agg={{
                      field: 'informationtype',
                      aggName: 'informationtype_agg.informationtype_token',
                    }}
                  />
                </Grid.Column>
                <Grid.Column width={12}>
                  <ResultsLoader>
                    <EmptyResults />
                    <Error />
                    <OnResults />
                  </ResultsLoader>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Container>
        </ReactSearchKit>
      </OverridableContext.Provider>
    );
  }
}

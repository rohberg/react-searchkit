/*
 * This file is part of React-SearchKit.
 * Copyright (C) 2019 CERN.
 *
 * React-SearchKit is free software; you can redistribute it and/or modify it
 * under the terms of the MIT License; see LICENSE file for more details.
 */

import _extend from 'lodash/extend';
import _isEmpty from 'lodash/isEmpty';

export class DemoESRequestSerializer {
  getFilters = filters => {
    /**
     * input: [
     *   [ 'type_agg', 'value1' ]
     *   [ 'type_agg', 'value2', [ 'subtype_agg', 'a value' ] ]
     * ]
     */
    const aggValueObj = {};

    const getChildFilter = filter => {
      const aggName = filter[0];
      const fieldValue = filter[1];
      if (aggName in aggValueObj) {
        aggValueObj[aggName].push(fieldValue);
      } else {
        aggValueObj[aggName] = [fieldValue];
      }
      const hasChild = filter.length === 3;
      if (hasChild) {
        getChildFilter(filter[2]);
      }
    };

    filters.forEach(filterObj => {
      getChildFilter(filterObj);
    });

    /**
     * output: {
     *   type_agg: ['value1', 'value2']
     *   subtype_agg: [ 'a value' ]
     * }
     */
    return aggValueObj;
  };

  /**
   * Return a serialized version of the app state `query` for the API backend.
   * @param {object} stateQuery the `query` state to serialize
   */
  serialize = stateQuery => {
    const { queryString, sortBy, sortOrder, page, size, filters } = stateQuery;
    console.log('serialize', filters);

    const bodyParams = {};
    if (!_isEmpty(queryString)) {
      bodyParams['query'] = {
        query_string: {
          query: queryString,
        },
      };
    }
    if (sortBy !== null) {
      const sortObj = {};
      sortObj[sortBy] = sortOrder && sortOrder === 'desc' ? 'desc' : 'asc';
      bodyParams['sort'].push(sortObj);
    }

    if (size > 0) {
      bodyParams['size'] = size;
    }

    if (page > 0) {
      const s = size > 0 ? size : 0;
      const from = (page - 1) * s;
      bodyParams['from'] = from;
    }

    // create post filters with the given filters
    if (filters.length) {
      // ES need the field name as field, get the field name from the aggregation name
      const aggFieldsMapping = {
        'kompasscomponent_agg.kompasscomponent_token': 'kompasscomponent',
        'targetaudience_agg.targetaudience_token': 'targetaudience',
        'organisationunit_agg.organisationunit_token': 'organisationunit',
        'informationtype_agg.informationtype_token': 'informationtype',
      };
      const aggValueObj = this.getFilters(filters);
      // conver to object
      const terms = Object.keys(aggValueObj).map(aggName => {
        const obj = {};
        const fieldName = aggFieldsMapping[aggName];
        obj[fieldName] = aggValueObj[aggName];
        return { terms: obj };
      });
      bodyParams['post_filter'] = { bool: { must: terms } };
    }

    // simulate a backend that defines all the possible complex aggregations per index
    // for this demo, we define a few simple aggregations
    bodyParams['aggs'] = {};

    // bucket term aggregation on `tags` field
    const aggBucketTermsTags = { tags_agg: { terms: { field: 'tags' } } };
    _extend(bodyParams['aggs'], aggBucketTermsTags);
    // bucket nested aggregation on `employee_type` field
    // TODO filter buckets
    const filter_debug = {
      bool: {
        must: [
          {
            terms: {
              "review_state": [
                  "private",
              ]
            },
          },
          //  {
          //     "terms": {
          //        "freemanualtags_agg": [
          //           "Module"
          //        ]
          //     }
          //  },
        ],
      },
    };
    
    // TODO filter buckets
    const aggBucketNestedEmployeeType = {
      "kompasscomponent_agg": {
        "nested": {
          "path": "kompasscomponent"
        },
        "aggs": {
          "inner": {
            "filter": {
              "terms": {
                  "kompasscomponent.token": [
                      "BEW",
                      "LENA"
                  ]
              }
            },
            "aggs": {
              "kompasscomponent_token": {
                "terms": {
                  "field": "kompasscomponent.token",
                  "order": {
                    "_key": "asc"
                  }
                },
              }
            }
          }
        },
      },
      "informationtype_agg": {
        "nested": {
          "path": "informationtype"
        },
        "aggs": {
          "informationtype_token": {
            "terms": {
              "field": "informationtype.token",
              "order": {
                "_key": "asc"
              }
            },
            "aggs": {
              "somemoredatafromelasticsearch": {
                "top_hits": {
                  "size": 1,
                  "_source": {
                    "include": [
                      "informationtype"
                    ]
                  }
                }   
              }
            }
          }
        }
      }
    };



    _extend(bodyParams['aggs'], aggBucketNestedEmployeeType);

    // console.log('bodyParams', bodyParams);
    return bodyParams;
  };
}

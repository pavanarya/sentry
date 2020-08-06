import React from 'react';
import {Location} from 'history';
import styled from '@emotion/styled';
import isFinite from 'lodash/isFinite';

import {PanelTable, Panel, PanelHeader, PanelItem} from 'app/components/panels';
import DateTime from 'app/components/dateTime';
import {Goal, Member, Organization, Project, SelectValue} from 'app/types';
import EventView from 'app/utils/discover/eventView';
import {tokenizeSearch, stringifyQueryObject} from 'app/utils/tokenizeSearch';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import ProgressRing from 'app/components/progressRing';
import {t} from 'app/locale';
import GlobalModal from 'app/components/globalModal';
import Button from 'app/components/button';
import {openModal} from 'app/actionCreators/modal';
import {getAggregateAlias} from 'app/utils/discover/fields';
import TextField from 'app/views/settings/components/forms/textField';
import SelectControl from 'app/components/forms/selectControl';

type Props = {
  goals?: Array<Goal>;
  organization: Organization;
  projects: Project[];
  location: Location;
};

type State = {
  orgMemberList: Array<Member>;
  isDropdownBusy: boolean;
  query: string;
};

const goals: Array<Goal> = [
  {
    id: '1',
    dateCreated: String(new Date()),
    title: 'Finish Goals Page',
    duedate: String(new Date()),
    progress: 30,
    owner: {
      // @ts-ignore
      user: {
        id: '1',
        name: 'Jane Bloggs',
        email: 'janebloggs@example.com',
      },
      inviteStatus: 'requested_to_join',
    },
    transactionName: '/api/0/organizations/{organization_slug}/eventsv2/',
    aggregateObjective: 'apdex(300)',
    comparisonOperator: '>=',
    valueObjective: 0.9,
  },
];
class Goals extends React.Component<Props, State> {
  renderGoal = (goal: Goal) => {
    const {organization, projects, location} = this.props;

    const orgFeatures = new Set(organization.features);

    const searchConditions = tokenizeSearch('');
    searchConditions.setTag('event.type', ['transaction']);
    searchConditions.setTag('transaction', [goal.transactionName]);

    const eventView = EventView.fromSavedQuery({
      id: undefined,
      name: 'Transaction',
      fields: [
        'transaction',
        'project',
        'epm()',
        'p50()',
        'p95()',
        'failure_rate()',
        `apdex(${organization.apdexThreshold})`,
        'count_unique(user)',
        `user_misery(${organization.apdexThreshold})`,
      ],
      orderby: '-timestamp',
      query: stringifyQueryObject(searchConditions),
      // if an org has no global-views, we make an assumption that errors are collected in the same
      // project as the current transaction event where spans are collected into
      projects: orgFeatures.has('global-views') ? [] : projects.map(p => Number(p.id)),
      version: 2,
      range: '90d',
    });

    return (
      <DiscoverQuery
        eventView={eventView}
        orgSlug={organization.slug}
        location={location}
      >
        {({isLoading, tableData}) => {
          if (isLoading || !tableData) {
            return null;
          }

          if (tableData.data.length <= 0) {
            return null;
          }

          const row = tableData.data[0];
          const needle = getAggregateAlias(goal.aggregateObjective);

          let currentValue = Number(row[needle]);
          if (!isFinite(currentValue)) {
            currentValue = 0;
          }

          const progress =
            1 - Math.abs(currentValue - goal.valueObjective) / goal.valueObjective;

          console.log('tableData', tableData);
          console.log('row', row);
          console.log('cell', row[needle]);

          return (
            <React.Fragment key={goal.id}>
              <div>{goal.title}</div>
              <div>{goal.transactionName}</div>
              <div>{`${goal.aggregateObjective} ${goal.comparisonOperator} ${goal.valueObjective}`}</div>
              <div>{`${currentValue}`}</div>
              <div>
                <ProgressRing value={progress * 100} size={40} barWidth={6} />
              </div>
              <DateTime date={goal.duedate} shortDate />
              <div>{goal.description || '-'}</div>
              <div>{goal.owner.user.name}</div>
            </React.Fragment>
          );
        }}
      </DiscoverQuery>
    );
  };

  setGoalName = value => {
    // this.setState({
    //   teamDescription: value,
    // });
  };

  setAggregateFunction = value => {};

  render() {
    const aggregateOptions: Array<SelectValue<string>> = [
      {
        label: 'foo',
        value: 'foo',
      },
      {
        label: 'bar',
        value: 'bar',
      },
    ];

    return (
      <React.Fragment>
        <HeaderContainer>
          <Button
            onClick={() =>
              openModal(({closeModal, Header, Body}) => (
                <div>
                  <Header>Add Goal</Header>
                  <Body>
                    <Panel>
                      <TextField
                        name="goal-name"
                        label="Set goal name"
                        placeholder="Set goal name"
                        onChange={this.setGoalName}
                        value={''}
                      />
                      <TextField
                        name="transaction-name"
                        label="Set transaction name"
                        placeholder="Set transaction name"
                        onChange={this.setGoalName}
                        value={''}
                      />
                      <PanelItem>
                        <ObjectiveContainer>
                          <AggregateContainer>
                            <SelectControl
                              key="select"
                              name="aggregate"
                              placeholder={t('Select aggregate')}
                              options={aggregateOptions}
                              value={aggregateOptions[1]}
                              required
                              onChange={this.setAggregateFunction}
                            />
                          </AggregateContainer>
                        </ObjectiveContainer>
                      </PanelItem>
                    </Panel>
                    <Button onClick={closeModal}>Close</Button>
                  </Body>
                </div>
              ))
            }
          >
            Add Goal
          </Button>
        </HeaderContainer>
        <PanelTable
          headers={[
            t('Title'),
            t('Transaction Name'),
            t('Objective'),
            t('Current'),
            t('Progress'),
            t('Due date'),
            t('Description'),
            t('Created By'),
          ]}
          emptyMessage={t('This team has no goals')}
        >
          {goals.map(goal => this.renderGoal(goal))}
        </PanelTable>
        <GlobalModal />
      </React.Fragment>
    );
  }
}

const HeaderContainer = styled('div')`
  margin-bottom: 8px;
`;

const ObjectiveContainer = styled('div')`
  width: 100%;
  display: flex;
`;

const AggregateContainer = styled('div')`
  flex-grow: 1;
`;

export default Goals;

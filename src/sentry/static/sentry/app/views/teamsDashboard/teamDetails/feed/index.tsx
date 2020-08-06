import React from 'react';
import styled from '@emotion/styled';

import {t} from 'app/locale';
import AsyncComponent from 'app/components/asyncComponent';
import space from 'app/styles/space';
import {Team, Project, Organization} from 'app/types';

import withLocalStorage, {InjectedLocalStorageProps} from '../../withLocalStorage';
import {TAB} from '../../utils';
import Card from './cards';
import CardAddNew from './cards/cardAddNew';
import CardIssueList from './cards/cardIssueList';
import CardPerformance from './cards/cardPerformance';
import CardDiscover from './cards/cardDiscover';
import {CardData, DashboardData} from './types';
import {getDevData} from './utils';

const DEFAULT_STATE: DashboardData = {
  cards: [],
};

type Props = AsyncComponent['props'] &
  InjectedLocalStorageProps & {
    data: DashboardData;
    organization: Organization;
    team: Team;
    projects: Project[];
  };

type State = AsyncComponent['state'] & {
  keyTransactions: {
    data: {
      project: string;
      transaction: string;
      user_misery_300: string;
      apdex_300: string;
    }[];
  };
};

class Dashboard extends AsyncComponent<Props, State> {
  getEndpoints(): ReturnType<AsyncComponent['getEndpoints']> {
    const {organization} = this.props;

    const keyTransactionPayload = {
      query: {
        statsPeriod: '24h',
        field: ['transaction', 'project', 'project.id', 'apdex(300)', 'user_misery(300)'],
        sort: 'transaction',
        per_page: 50,
      },
    };

    return [
      [
        'keyTransactions',
        `/organizations/${organization.slug}/key-transactions/`,
        keyTransactionPayload,
      ],
    ];
  }

  componentDidUpdate(prevProps) {
    if (prevProps === this.props) {
      return;
    }

    const {team, projects, organization} = this.props;
    const {keyTransactions} = this.state;
    const keyTransactionsData = keyTransactions?.data ?? [];
    const data = this.getTabData();

    // we need to wait for all the necessary data to finish loading,
    // so check all the necessary values before setting it
    // Set localStorage with dev data
    if (Object.keys(data).length === 0 && team?.slug && projects.length) {
      this.props.setLs(
        team.slug,
        getDevData(projects, organization, keyTransactionsData)
      );
    }
  }

  resetLs = () => {
    const {team} = this.props;
    this.props.resetLs(team.slug, DEFAULT_STATE);
  };

  addCard = (index: number, cardData: CardData) => {
    const {team} = this.props;
    const data = this.getTabData();
    const prevCards = data.cards;
    const nextCards = [...prevCards.slice(0, index), cardData, ...prevCards.slice(index)];

    this.props.setLs(team.slug, {...data, cards: nextCards});
  };

  removeCard = (index: number) => {
    const {team} = this.props;
    const data = this.getTabData();
    const prevCards = data.cards;
    const nextCards = [...prevCards.slice(0, index), ...prevCards.slice(index + 1)];

    this.props.setLs(team.slug, {...data, cards: nextCards});
  };

  getCardComponent(type) {
    switch (type) {
      case 'performance':
        return CardPerformance;
      case 'issueList':
        return CardIssueList;
      case 'discover':
        return CardDiscover;
      default:
        return Card;
    }
  }

  getTabData() {
    const {data, team} = this.props;
    return data?.[team.slug] ?? {};
  }

  getCardData(): CardData[] {
    const data = this.getTabData();
    const cards: CardData[] = [...data?.cards] ?? [];

    return cards;
  }

  renderIssueList(cards) {
    const {team} = this.props;
    return (
      <div>
        <h3>{t('Issues List')}</h3>
        <Container>
          {cards.map((c, i) => (
            <CardIssueList
              key={c.key || c.data?.id || i.toString()}
              index={i}
              card={this.removeCard}
              teamSlug={team.slug}
              projects={this.props.projects}
              {...c}
            />
          ))}
        </Container>
      </div>
    );
  }

  renderDiscoverCards(cards) {
    return (
      <div>
        <h3>{`${t('Discover Queries')} (${cards.length})`}</h3>
        <Container>
          {cards.map((c, i) => (
            <CardDiscover
              key={c.key || c.data?.id || i.toString()}
              index={i}
              card={this.removeCard}
              {...c}
            />
          ))}
        </Container>
      </div>
    );
  }

  renderPerformanceCards(cards) {
    return (
      <div>
        <h3>{`${t('Key Transactions')} (${cards.length})`}</h3>
        <Container>
          {cards.map((c, i) => (
            <CardPerformance
              key={c.key || c.data?.id || i.toString()}
              index={i}
              card={this.removeCard}
              {...c}
            />
          ))}
        </Container>
      </div>
    );
  }

  render() {
    const data = this.getTabData();

    if (Object.keys(data).length === 0) {
      return <h3>LOADING!</h3>;
    }

    const cards = this.getCardData();

    return (
      <Content>
        {this.renderIssueList(cards.filter(c => c.type === 'issueList'))}
        {this.renderDiscoverCards(cards.filter(c => c.type === 'discover'))}
        {this.renderPerformanceCards(cards.filter(c => c.type === 'performance'))}
        <div>
          <h3>{t('Debugging Stuff')}</h3>
          <Container>
            <CardAddNew
              index={cards.length + 1}
              removeCard={this.removeCard}
              addCard={this.addCard}
              resetLs={this.resetLs}
              resetLsAll={this.props.resetLsAll}
            />
          </Container>
        </div>
      </Content>
    );
  }
}

export default withLocalStorage(Dashboard, TAB.DASHBOARD);

const Content = styled('div')`
  display: grid;
  grid-template-columns: repeat(1, minmax(100px, 1fr));
  grid-gap: ${space(3)};
`;

const Container = styled('div')`
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  grid-gap: ${space(3)};
`;

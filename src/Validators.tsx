import { Col, Row, Tabs, Typography } from 'antd';
import axios from 'axios';
import React, { Component } from 'react';
import { Bar, Chart, Tooltip } from 'viser-react';

const { TabPane } = Tabs;


const { Text, Title, Link } = Typography;

const scale = [{
  dataKey: 'voting_power',
  tickInterval: 100,
  max: 50 * 100
}];

interface LatestValidatorResponse {
  block_height: number;
  validators: {
    address: string;
    pub_key: { "@type": string; value: string };
    proposer_priority: string;
    voting_power: string;
  }[];
}

interface AllValidatorResponse {
  validators: {
    operator_address: string;
    consensus_pubkey: { "@type": string; value: string };
    jailed: boolean;
    status: string;
    tokens: string;
    delegator_shares: string;
    description: {
      moniker: string;
      identity: string;
      website: string;
      security_contact: string;
      details: string;
    };
    unbonding_time: string;
    unbonding_height: string;
    min_self_delegation: {
      commission_rates: {
        rate: string;
        max_rate: string;
        max_change_rate: string;
      };
      update_time: string;
    };
    commission: string;
  }[];
}

interface Validator {
  address: string;
  abbrev: string;
  pub_key: { "@type": string; value: string };
  proposer_priority: number;
  voting_power: number;
  color: string;
  link: string;
}

class ValidatorsComponent extends Component {
  state: {
    validators?: Validator[],
    block_height?: null,
    total_stake?: number,
    net_new_dos_cost?: number,
    existing_dos_cost?: number,
    min_validator_cartel?: number,
    gini_coefficient?: number,
    max_gini?: number,
  } = {}

  constructor(props: any) {
    super(props)
  }

  async componentDidMount() {
    const res = await axios.get<LatestValidatorResponse>(`http://35.175.206.227:1317/cosmos/base/tendermint/v1beta1/validatorsets/latest`);

    const validators: Validator[] = res.data.validators.map((v, i) => {
      return {
        voting_power: parseInt(v.voting_power),
        proposer_priority: parseInt(v.proposer_priority),
        address: v.address,
        pub_key: v.pub_key,
        abbrev: v.address,
        color: 'blue',
        link: 'https://testnet.explorer.agoric.net/validator/' + v.address
      }
    }).sort(v => v.voting_power);
    const block_height = res.data.block_height;
    const total_stake = validators.reduce((p, c) => p + c.voting_power, 0);

    let attacker_stake = 0;
    let min_validator_cartel = 0;
    for (const validator of validators) {
      if (attacker_stake > ((2 * (total_stake / 3)) + 1)) {
        break;
      }
      attacker_stake = attacker_stake + validator.voting_power;
      min_validator_cartel++;
    }

    const ordered_voting_power = validators
      .map(v => v.voting_power)
      .sort((a, b) => a - b);

    const one_over_sum = Math.pow(ordered_voting_power.reduce((a, b) => a + b, 0), -1) // sum

    const sum_cumsum = ordered_voting_power
      .reduce((a: number[], x, i) => [...a, x + (a[i - 1] || 0)], []) // cumsum
      .reduce((a, b) => a + b, 0) // sum

    const two_over_n_plus_one = (2 / (validators.length + 1));

    const gini_coefficient = 1 - (two_over_n_plus_one * sum_cumsum * one_over_sum);
    const rounded_gini_coefficient = Math.round((gini_coefficient + Number.EPSILON) * 1000) / 1000;

    const max_gini = Math.round((((validators.length - 1) / (validators.length + 1)) + Number.EPSILON) * 100) / 100;

    this.setState({
      validators: validators,
      total_stake: total_stake,
      block_height: block_height,
      net_new_dos_cost: Math.round((total_stake / 2) + 1),
      existing_dos_cost: Math.round((total_stake / 3) - validators[0].voting_power) + 1,
      min_validator_cartel: min_validator_cartel,
      max_gini: max_gini,
      gini_coefficient: rounded_gini_coefficient,
    });
  }

  componentDidUpdate() {
    // this.createValidatorsComponent()
  }

  render() {
    return <div>
      <Row style={{ textAlign: 'center', padding: '0 0 50px 0' }}>
        <Col span={24}>
          <Title level={3}>How Decentralized is agorictest-7?</Title>
          <Text type="secondary">
            As of block:&ensp;
            <Link href="https://testnet.explorer.agoric.net/blocks" target="_blank">
              {this.state.block_height}
            </Link>
          </Text>
        </Col>
      </Row>
      <Tabs defaultActiveKey="1" tabPosition="left" size="large">
        <TabPane tab="Gini Coefficient" key="1">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.gini_coefficient}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Gini Coefficient</Title>
                <Text type="secondary">
                  The Gini Coefficient indicates the degree of inequality among the validators. Here we use it to simplify the inequality of the 100 validators into a single scalar, where 0 represents a perfectly equal pool of validators and 1 represents a pool where one validator controls all the stake. Given that the set of validators is discrete and small, the actual max is {this.state.max_gini}.
                </Text>
              </Col>
            </Row>
            <Chart forceFit height={400} data={this.state.validators} scale={scale} animate={true}>
              <Tooltip />
              <Bar position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Net New DOS" key="2">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.net_new_dos_cost}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Net New DOS Cost</Title>
                <Text type="secondary">
                  This is what it would cost a net new validator to join the network and throw a wrench into the operations. At 33% + 1 of the stake, this validator could torpedo the network by preventing the rest of the validators from reaching consensus.
              </Text>
              </Col>
            </Row>
            <Chart forceFit height={400} data={this.state.validators} scale={scale} animate={true}>
              <Tooltip />
              <Bar position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Existing DOS" key="3">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.existing_dos_cost}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Existing DOS Cost</Title>
                <Text type="secondary">
                  This is what it would cost the largest existing validator to hold the rest of the network hostage by preventing a consensus.
              </Text>
              </Col>
            </Row>
            <Chart forceFit height={400} data={this.state.validators} scale={scale} animate={true}>
              <Tooltip />
              <Bar position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Smallest Cartel" key="4">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.min_validator_cartel}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Minimum Controlling Cartel</Title>
                <Text type="secondary">
                  This is the lowest number of validators that are able to conspire to take control of the network and rewrite history or change the rules of the game.
              </Text>
              </Col>
            </Row>
          </div>
        </TabPane>
        <TabPane tab="Total Stake" key="5">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.total_stake}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Total Validator Stake</Title>
                <Text type="secondary">
                  The total stake of the 100 validators of the most recent block. This is a very rough measure of the health of the network. A network with a larger total stake is more expensive to attack.
              </Text>
              </Col>
            </Row>
            <Chart forceFit height={400} data={this.state.validators} scale={scale} animate={true}>
              <Tooltip />
              <Bar position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
      </Tabs>

    </div>
  }
}
export default ValidatorsComponent

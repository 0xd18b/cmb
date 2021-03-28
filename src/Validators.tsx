import { Col, Row, Tabs, Typography } from 'antd';
import axios from 'axios';
import React, { Component } from 'react';
import { Bar, Chart, Polygon, StackBar, Tooltip } from 'viser-react';
const DataSet = require('@antv/data-set');

const { TabPane } = Tabs;

const { Text, Title, Link } = Typography;

interface LatestValidator {
  address: string;
  pub_key: {
    "@type": string;
    key: string;
  };
  proposer_priority: string;
  voting_power: string;
};

interface LatestValidatorResponse {
  block_height: number;
  validators: LatestValidator[];
}

interface RichValidator {
  operator_address: string;
  consensus_pubkey: {
    "@type": string;
    key: string;
  };
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
}

interface AllValidatorResponse {
  pagination: {
    next_key: string;
    total: string;
  };
  validators: RichValidator[];
}

interface Validator {
  address: string;
  height: number;
  abbrev: string;
  pub_key?: {
    "@type": string;
    key: string;
  };
  proposer_priority: number;
  voting_power: number;
  label: string;
  link: string;
}

const style = {
  lineWidth: 1,
  stroke: '#fff',
};

const label = ['name', {
  offset: 0,
  textStyle: {
    textBaseline: 'middle',
  },
  formatter(val: any) {
    if (val !== 'root') {
      return val;
    }
  }
}];

const tooltip = ['name*value', (name: any, value: any) => ({ name, value })];

const itemTpl = `
<li data-index={index}>
  <span style="background-color:{color};" class="g2-tooltip-marker"></span>
  {name}
  <br/>
  <span style="padding-left: 16px">voting_power：{value}</span>
  <br/>
</li>
`;

class ValidatorsComponent extends Component {
  state: {
    validators: Validator[],
    block_height?: null,
    total_stake?: number,
    outside_disruptor_cost?: number,
    inside_disruptor_cost?: number,
    min_validator_cartel?: number,
    gini_coefficient?: number,
    max_gini?: number,
    validators_with_outside_disruptor: Validator[],
    validators_with_inside_disruptor: Validator[],
    cartel_validators: Validator[],
    transformed_validators: Validator[],
    scale?: [],
  } = {
      validators: [],
      validators_with_outside_disruptor: [],
      validators_with_inside_disruptor: [],
      cartel_validators: [],
      transformed_validators: [],
    }

  constructor(props: any) {
    super(props)
  }

  shuffle<T>(validators: T[]): T[] {
    var currentIndex = validators.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = validators[currentIndex];
      validators[currentIndex] = validators[randomIndex];
      validators[randomIndex] = temporaryValue;
    }

    return validators;
  }

  middleSort(validators: Validator[]): Validator[] {
    validators.sort((a, b) => b.voting_power - a.voting_power);
    const sorted_validators: Validator[] = [];
    for (let [i, validator] of validators.entries()) {
      if (i % 2 === 0) {
        sorted_validators.push(validator);
      } else {
        sorted_validators.unshift(validator);
      }
    }
    return sorted_validators;
  }

  totalStake(validators: Validator[]): number {
    return validators.map(v => v.voting_power).reduce((a, b) => a + b, 0);
  }

  async componentDidMount() {

    const all_validators = [];
    let all_validator_response = await axios.get<AllValidatorResponse>(`http://35.175.206.227:1317/cosmos/staking/v1beta1/validators`);
    all_validators.push(...all_validator_response.data.validators);
    let call_count = 0;

    while (all_validator_response.data.pagination.next_key && call_count < 10) { // escape hatch, don't call more than 10 times...
      all_validator_response = await axios.get<AllValidatorResponse>(`http://35.175.206.227:1317/cosmos/staking/v1beta1/validators?pagination.key=${all_validator_response.data.pagination.next_key}`);
      all_validators.push(...all_validator_response.data.validators);
      call_count++;
    }

    const validator_map = all_validators.reduce((p: { [pub_key: string]: RichValidator }, v: RichValidator) => {
      p[v.consensus_pubkey.key] = v;
      return p;
    }, {})

    const latest_validator_response = await axios.get<LatestValidatorResponse>(`http://35.175.206.227:1317/cosmos/base/tendermint/v1beta1/validatorsets/latest`);
    const block_height = latest_validator_response.data.block_height;

    const validators: Validator[] = this.shuffle(latest_validator_response.data.validators)
      .map((v, i) => {
        return {
          voting_power: parseInt(v.voting_power),
          proposer_priority: parseInt(v.proposer_priority),
          address: v.address,
          height: block_height,
          pub_key: v.pub_key,
          abbrev: validator_map[v.pub_key.key].description.moniker,
          label: 'voting_power',
          link: 'https://testnet.explorer.agoric.net/validator/' + validator_map[v.pub_key.key].operator_address
        }
      })
      .sort((a, b) => b.voting_power - a.voting_power);

    const total_stake = this.totalStake(validators)

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

    const all_but_last_stake = this.totalStake(validators.slice(0, -1));
    const net_new_disrupter = Math.round((all_but_last_stake / 2) + 1);

    const sourceData = {
      name: 'root',
      children: [...validators],
    }

    const dv = new DataSet.View().source(sourceData, {
      type: 'hierarchy',
    });
    dv.transform({
      field: 'voting_power',
      type: 'hierarchy.treemap',
      tile: 'treemapResquarify',
      as: ['x', 'y'],
    });
    const transformed_validators = dv.getAllNodes().map((node: any) => ({
      ...node,
      name: node.data.abbrev,
      value: node.data.voting_power,
    }));

    const validators_with_outside_disruptor: Validator[] = [
      {
        voting_power: net_new_disrupter,
        proposer_priority: 0,
        height: block_height,
        address: 'attacker',
        abbrev: 'attacker',
        label: 'required_to_attack',
        link: 'https://docs.tendermint.com/master/spec/light-client/accountability/#detailed-attack-scenarios'
      },
      ...validators.slice(0, -1),
    ];

    const cartel_validators: Validator[] = validators.map((v, i) => {
      return {
        ...v,
        label: (i <= min_validator_cartel ? 'cartel_voting_power' : v.label),
      }
    });

    const inside_disruptor_cost = Math.round((total_stake / 2) - validators[0].voting_power) + 1;
    const validators_with_inside_disruptor: Validator[] = [
      ...validators,
      {
        ...validators[0],
        voting_power: inside_disruptor_cost,
        label: 'required_to_attack',
        link: 'https://docs.tendermint.com/master/spec/light-client/accountability/#detailed-attack-scenarios'
      },
    ];
    console.log()

    this.setState({
      validators: this.middleSort(validators),
      total_stake: total_stake,
      block_height: block_height,
      outside_disruptor_cost: net_new_disrupter,
      validators_with_outside_disruptor: this.middleSort(validators_with_outside_disruptor),
      inside_disruptor_cost: inside_disruptor_cost,
      min_validator_cartel: min_validator_cartel,
      max_gini: max_gini,
      gini_coefficient: rounded_gini_coefficient,
      cartel_validators: this.middleSort(cartel_validators),
      validators_with_inside_disruptor: this.middleSort(validators_with_inside_disruptor),
      transformed_validators: transformed_validators,
      scale: [{
        dataKey: 'voting_power',
        max: total_stake,
      }]
    });
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
                  The Gini Coefficient indicates the degree of inequality across the validator stake. Here we use it to simplify the inequality of the 100 validators into a single scalar, where 0 represents a perfectly equal pool of validators and 1 represents a pool where one validator controls all the stake. Given that the set of validators is discrete and n={this.state.validators?.length}, the effective max value is {this.state.max_gini}.
                </Text>
              </Col>
            </Row>
            <Chart forceFit height={500} data={this.state.validators} scale={{ dataKey: 'voting_power', max: (this.totalStake(this.state.validators) / 3) }} animate={true}>
              <Tooltip />
              <Bar color="label" position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Outsider Disrupter" key="2">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.outside_disruptor_cost}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Outsider Disrupter Cost</Title>
                <Text type="secondary">
                  This is what it would cost any external actor to join the network as a validator and throw a wrench into the operations. At 33% + 1 of the stake, this validator could attack network through <Link href="https://docs.tendermint.com/master/spec/light-client/accountability/#scenario-1-equivocation-on-the-main-chain" target="_blank">Equivocation</Link> or <Link href="https://docs.tendermint.com/master/spec/light-client/accountability/#scenario-3-at-most-2-3-of-faults" target="_blank">Amnesia</Link>.
                </Text>
              </Col>
            </Row>
            <Chart forceFit height={500} data={this.state.validators_with_outside_disruptor} scale={{ dataKey: 'voting_power', max: (this.totalStake(this.state.validators_with_outside_disruptor) / 3) }} animate={true}>
              <Tooltip />
              <Bar color="label" position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Insider Disrupter" key="3">
          <div>
            <Row>
              <Col span={4} style={{ textAlign: 'right', padding: '0 50px 0 0' }}>
                <Title level={1}>{this.state.inside_disruptor_cost}</Title>
              </Col>
              <Col span={8}>
                <Title level={4}>Insider Disrupter Cost</Title>
                <Text type="secondary">
                  This is what it would cost the largest existing validator to hold the rest of the network hostage. At 33% + 1 of the stake, this validator could attack network through <Link href="https://docs.tendermint.com/master/spec/light-client/accountability/#scenario-1-equivocation-on-the-main-chain" target="_blank">Equivocation</Link> or <Link href="https://docs.tendermint.com/master/spec/light-client/accountability/#scenario-3-at-most-2-3-of-faults" target="_blank">Amnesia</Link>.
                </Text>
              </Col>
            </Row>
            <Chart forceFit height={500} data={this.state.validators_with_inside_disruptor} scale={{ dataKey: 'voting_power', max: (this.totalStake(this.state.validators_with_inside_disruptor) / 3) }} animate={true}>
              <Tooltip />
              <StackBar position="abbrev*voting_power" color="label" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
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
                  This is the lowest number of validators that are able to conspire to take control of the network and <Link href="https://docs.tendermint.com/master/spec/light-client/accountability/#scenario-4-more-than-2-3-of-faults" target="_blank">arbitrarily change application state</Link>.
                </Text>
              </Col>
            </Row>
            <Chart forceFit height={500} data={this.state.cartel_validators} scale={{ dataKey: 'voting_power', max: (this.totalStake(this.state.cartel_validators) / 3) }} animate={true}>
              <Tooltip />
              <Bar color="label" position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
            </Chart>
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
            <Chart forceFit height={500} data={this.state.transformed_validators} scale={{ dataKey: 'voting_power', max: (this.totalStake(this.state.transformed_validators) / 3) }} padding={0} animate={true}>
              <Tooltip showTitle={false} itemTpl={itemTpl} />
              <Polygon position="x*y" color="name" tooltip={tooltip} style={style} label={label} onClick={(ref) => window.open(ref.data._origin.data.link, '_blank')} />
            </Chart>
          </div>
        </TabPane>
        <TabPane tab="Feedback ?" key="6">
          <div>
            <Row>
              <Col style={{ textAlign: 'center' }} span={20}>
                <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSen5xfBkFQ_H5BH5x2Uhxsxk25c3SCfHdeGCc4W-xVCr5doSg/viewform?embedded=true" width="640" height="1100" frameBorder="0" marginHeight={0} marginWidth={0}>Loading…</iframe>
              </Col>
            </Row>
          </div>
        </TabPane>
      </Tabs>

    </div>
  }
}
export default ValidatorsComponent

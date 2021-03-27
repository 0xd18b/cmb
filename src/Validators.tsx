import { Divider } from 'antd';
import axios from 'axios';
import React, { Component } from 'react';
import { Bar, Chart, Tooltip } from 'viser-react';
import './App.css';

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
    net_new_disruptor_stake?: number,
    min_validator_cartel?: number,
  } = {}

  constructor(props: any) {
    super(props)
  }

  async componentDidMount() {
    const res = await axios.get<LatestValidatorResponse>(`http://35.175.206.227:1317/cosmos/base/tendermint/v1beta1/validatorsets/latest`);

    const validators: Validator[] = res.data.validators.map(v => {
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
      if (attacker_stake > ((total_stake / 3) + 1)) {
        break;
      }
      attacker_stake = attacker_stake + validator.voting_power;
      min_validator_cartel++;
    }

    this.setState({
      validators: validators,
      total_stake: total_stake,
      block_height: block_height,
      net_new_disruptor_stake: Math.round((total_stake / 2) + 1),
      min_validator_cartel: min_validator_cartel,
    });
  }

  componentDidUpdate() {
    // this.createValidatorsComponent()
  }

  render() {
    return <div>
      <p>agorictest-7 Decentralization Health Metrics</p>
      <p>as of block {this.state.block_height} </p>
      <p>Combined Validator Stake: {this.state.total_stake}</p>
      <p>33% Net New Disruptor Cost: {this.state.net_new_disruptor_stake}</p>
      <p>Minimum Potential Malicious Validators: {this.state.min_validator_cartel}</p>
      <Divider />
      <div>
        <Chart forceFit height={400} data={this.state.validators} scale={scale}>
          <Tooltip />
          <Bar position="abbrev*voting_power" onClick={(ref) => window.open(ref.data._origin.link, '_blank')} />
        </Chart>
      </div>
    </div>
  }
}
export default ValidatorsComponent

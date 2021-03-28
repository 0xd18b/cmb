import { Layout, Typography } from 'antd';
import 'antd/dist/antd.css';
import React from 'react';
import { Global } from 'viser-react';
import './App.css';
import Validators from './Validators';
const { Text, Title, Link } = Typography;
Global.registerTheme('newTheme', {
  colors: ['#1890ff', '#d7504b']
});

Global.setTheme('newTheme');

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout>
      <Content style={{ padding: '50px 50px' }}>
        <Validators />
      </Content>
      <Footer style={{ textAlign: 'center', color: 'grey' }}>
        Constructed and operated by Validator <Link href="https://testnet.explorer.agoric.net/validator/agoricvaloper1zdfv0v74pjnupn05htn9lsrtqgd7mepw80atm0" target="_blank">0xd18b</Link> | No warranty or liability for use of any kind | Software License: <Link href="https://raw.githubusercontent.com/0xd18b/cmb/main/LICENSE.md" target="_blank">MIT</Link> | <Link href="https://github.com/0xd18b/cmb" target="_blank">Source</Link>
      </Footer>
    </Layout>
  );
}

export default App;

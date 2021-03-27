import { Layout, Typography } from 'antd';
import 'antd/dist/antd.css';
import React from 'react';
import './App.css';
import Validators from './Validators';
const { Text, Title, Link } = Typography;

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout>
      <Content style={{ padding: '50px 50px' }}>
        <Validators />
      </Content>
      <Footer style={{ textAlign: 'center', color: 'grey' }}>
        Built and operated by 0xd18b | No warranty for use of any kind | Software License: <Link href="https://testnet.explorer.agoric.net/blocks" target="_blank">MIT</Link> | <Link href="https://github.com/0xd18b/cmb" target="_blank">Source</Link>
      </Footer>
    </Layout>
  );
}

export default App;

import { Layout } from 'antd';
import 'antd/dist/antd.css';
import React from 'react';
import './App.css';
import Validators from './Validators';

const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout>
      <Header>Header</Header>
      <Content style={{ padding: '0 50px' }}>
        <Validators />
      </Content>
      <Footer style={{ textAlign: 'center', color: 'grey' }}>0xd18b 2021</Footer>
    </Layout>
  );
}

export default App;

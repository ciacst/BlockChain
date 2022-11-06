import React, {useEffect, useState} from 'react';
import {proposalContract, web3} from "../utils/contracts";
import { Button, Form, Input, InputNumber, Space, Table, PageHeader} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import './index.css';
import 'antd/dist/antd.css'

const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
// TODO change according to your configuration
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

const ProposalPage = () => {

    const [account, setAccount] = useState('')
    const [accountBalance, setAccountBalance] = useState(0)
    const [total, setTotal] = useState(0)
    const [form] = Form.useForm<{ name: string; introductions: string; duration: Number}>();
    const nameValue = Form.useWatch('name', form);
    const introductionsValue = Form.useWatch('introductions', form);
    const durationValue = Form.useWatch('duration', form);
    const [show, setShow] = useState(<div></div>)
    const [, setUpdate] = useState(0)

    interface ProposalDataType {
        index: string;
        proposer: string;
        start_time: string;
        duration: string;
        name: string;
        introductions: string;
        agree: string;
        disagree: string;
        state: string;
    }

    var proposals: ProposalDataType[] = [];
   
    const refreshProposals = async () => {
        var dates = new Date();
        var now_times = dates.getTime();
        proposals.splice(0)
        for (var i = 0; i < total; i++) {
            await proposalContract.methods.checkDate(now_times).send({
                from: account
            })
            const po = await proposalContract.methods.proposals(i).call()
            // setProposals([...proposals, po])
            proposals.push(po)
        }
        console.log(proposals)
        window.location.reload()
    }

    const state_message = ["投票进行中", "投票已通过", "投票未通过"]

    const columns: ColumnsType<ProposalDataType> = [
        {
            title: '活动编号',
            dataIndex: 'index',
            key: 'index',
        },
        {
            title: '活动名称',
            dataIndex: 'name',
            key: 'index',
        },
        {
            title: '活动介绍',
            dataIndex: 'introductions',
            key: 'index',
            render: text => <Button onClick={() => onViewIntroductions(text)}>详情</Button>,
        },
        {
          title: '投票赞成人数',
          dataIndex: 'agree',
          key: 'index',
        },
        {
            title: '投票反对人数',
            dataIndex: 'disagree',
            key: 'index',
          },
        {
            title: '活动投票',
            dataIndex: 'index',
            key: 'action',
            render: (_, {index}) => (
            <Space size="middle">
                <a onClick={() => onVote(1, parseInt(index))}>赞成</a>
                <a onClick={() => onVote(0, parseInt(index))}>反对</a>
            </Space>
            ),
        },
        {
            title: '投票状态',
            dataIndex: 'state',
            key: 'state',
            render: text => (
                <p>{state_message[text]}</p>
            ),
        },
    ];

    useEffect(() => {
        // 初始化检查用户是否已经连接钱包
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        const initCheckAccounts = async () => {
            // @ts-ignore
            const {ethereum} = window;
            if (Boolean(ethereum && ethereum.isMetaMask)) {
                // 尝试获取连接的用户账户
                const accounts = await web3.eth.getAccounts()
                if(accounts && accounts.length) {
                    setAccount(accounts[0])
                }
            }
        }

        initCheckAccounts()
    }, [])

    useEffect(() => {
        const getTotalInfo = async () => {
            if (proposalContract) {
                const to = await proposalContract.methods.getTotal().call()
                setTotal(to)
            } else {
                alert('Contract not exists.')
            }
        }
        getTotalInfo()
    }, [])

    React.useEffect(() => {
        const getProposalInfo = async () => {
            let html = <div>nothing</div>
            var dates = new Date();
            var now_times = dates.getTime();
            proposals = [...proposals]
            if (proposalContract) {
                proposals.splice(0)
                for (var i = 0; i < total; i++) {
                    await proposalContract.methods.checkDate(now_times).call()
                    const po = await proposalContract.methods.proposals(i).call()
                    proposals.push(po)
                }
                setUpdate(1)
                console.log(proposals)
                html = <React.Fragment>
                    <Table columns={columns} rowKey="index" dataSource={proposals}/>
                </React.Fragment>
            } 
            else {
                alert('Contract not exists.')
            }
            return html;
        }
        getProposalInfo().then(function (res: JSX.Element) {setShow(res)})
    }, [total])

    useEffect(() => {
        const getAccountInfo = async () => {
            if (proposalContract) {
                const ab = await proposalContract.methods.balanceOf(account).call()
                setAccountBalance(ab)
            } else {
                alert('Contract not exists.')
            }
        }

        if(account !== '') {
            getAccountInfo()
        }
    }, [account])

    useEffect(() => {
        
    }, [])

    const onClaimTokenAirdrop = async () => {
        console.log()
        if(account === '') {
            alert('您还没有连接钱包!')
            return
        }

        if (proposalContract) {
            await proposalContract.methods.airdrop().send({
                from: account
            })
            window.location.reload()
        } else {
            alert('Contract not exists.')
        }
    }

    const onVote = async (user_choice:Number, index:Number) => {
        if (account === '') {
            alert('您还没有连接钱包!')
            return
        }
        if (proposalContract) {
            try {
                var dates = new Date();
                var now_times = dates.getTime();
                if (parseInt(proposals[parseInt(index.toString())].start_time) 
                + parseInt(proposals[parseInt(index.toString())].duration) <= now_times) {
                    alert('投票已截止!')
                }
                else {
                    await proposalContract.methods.vote(user_choice, index, now_times).send({
                        from: account
                    })
                    alert('投票成功!')
                }
                refreshProposals();
                window.location.reload()
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onProposal = async (duration:Number, name:string, introductions:string) => {
        if (account === '') {
            alert('您还没有连接钱包!')
            return
        }
        if (duration <= 0) {
            alert('投票持续时间不能小于等于0分钟!')
            return
        }
        if (name === '') {
            alert('活动名称不能为空!')
            return
        }
        if (proposalContract) {
            try {
                var dates = new Date();
                var now_times = dates.getTime();
                console.log(now_times)
                await proposalContract.methods.proposalInitiate(duration, name, introductions, now_times).send({
                    from: account
                })
                window.location.reload()
                alert('活动提案发起成功')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        // @ts-ignore
        const {ethereum} = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            alert('MetaMask is not installed!');
            return
        }

        try {
            // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
            if (ethereum.chainId !== GanacheTestChainId) {
                const chain = {
                    chainId: GanacheTestChainId, // Chain-ID
                    chainName: GanacheTestChainName, // Chain-Name
                    rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到Metamask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({ method: 'wallet_addEthereumChain', params: [chain]
                        });
                    }
                }
            }

            // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
            await ethereum.request({method: 'eth_requestAccounts'});
            // 获取小狐狸拿到的授权用户列表
            const accounts = await ethereum.request({method: 'eth_accounts'});
            // 如果用户存在，展示其account，否则显示错误信息
            setAccount(accounts[0] || 'Not able to get accounts');
            window.location.reload()
        } catch (error: any) {
            alert(error.message)
        }
    }

    const onViewIntroductions = async (introductions:string) => {
        alert(introductions)
    }

    return (
        <div>
            <Space>
                <PageHeader
                className="site-page-header"
                onBack={() => null}
                title="浙江大学学生社团组织治理"
                subTitle="去中心化应用"
                />
            </Space>
            <div className='account'>
                <div>
                    {account === '' && <Button type="primary" onClick={onClickConnectWallet}>连接钱包</Button>}
                    {account !== '' && <Button type="primary" onClick={onClaimTokenAirdrop}>领取浙大币空投</Button>}
                    <br></br>
                    <br></br>
                    <div>当前用户：{account === '' ? '无用户连接' : account}</div>
                    <br></br>
                    <div>当前用户拥有浙大币数量：{account === '' ? 0 : accountBalance}</div>
                    <br></br>
                </div>
                <div className='start'>
                    <br></br>
                    <Form form={form} layout="vertical" autoComplete="off">
                        <Form.Item name="name" label="活动名称">
                            <Input placeholder="请输入活动名称"/>
                        </Form.Item>
                        <Form.Item name="introductions" label="活动介绍">
                            <Input placeholder="请输入活动介绍"/>
                        </Form.Item>
                        <Form.Item name="duration" label="投票持续时间">
                            <InputNumber placeholder="分钟"/>
                        </Form.Item>
                    </Form>
                    <Button type="primary" onClick={() => onProposal(durationValue, nameValue, introductionsValue)}>
                        发起活动提案
                    </Button>
                    <br></br>
                    <br></br>
                </div>
                <div>
                    <Button type="primary" onClick={() => refreshProposals()}>刷新数据</Button>
                    <br></br>
                    <br></br>
                    <div>当前活动数量：{total}</div>
                    <br></br>
                    {show}
                </div>
            </div>
        </div>
        
    )
}

export default ProposalPage
import React from 'react';
import SideNav from './SideNav'
import Tamagotchi from './Tamagotchi'
import ModalForm from './ModalForm'
import Alert from 'react-bootstrap/Alert'


import "../css/Home.css"

export default class Home extends React.Component{

    state={
        interval: null,
        money: null,

        allSpecies: [],
        tamaStore: false,
        isOpen: false,
        modalForm: false,
        newTama: null,

        userPets: [],
        currentPet: null,
        feedIn: -1,
        cleanIn: -1,
        sleepIn: -1,
        deletedPets: [],

        miniGames: false,
        ticTacToe: false,
        janKen: false,
        gamble: false
    }

    // fetching list of all species.
    componentDidMount() {
        fetch('http://localhost:3000/getuser',{
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            'Authorization' : `Bearer ${localStorage.getItem('jwt')}`
        }})
        .then(res => res.json())
        .then(data => {
            this.setState({ money: data.user.money })
            this.props.refresh(data)
        })
        .then(() => {
            this.getAllPets()
            this.getUserPets()
            .then(userPets => this.updatePetStatuses(userPets))
            .then(userPets => this.setState({ 
                userPets: userPets, 
                currentPet: userPets.length > 0? userPets[0]: null,
                interval: setInterval(this.checkPetStatus, 300)
            }))
        })

    }

    // clear intervals
    componentWillUnmount() {
        clearInterval(this.state.interval)
    }

    // get all pet species for the tamastore
    getAllPets = () => {
        return fetch('http://localhost:3000/pets')
        .then(resp => resp.json())
        .then(data => this.setState({allSpecies: data}))
    }

    // get all of current user's userPets (in componentDidMount)
    getUserPets = () => {
        return fetch(`http://localhost:3000/users/${this.props.user.id}/user_pets`)
        .then(res => res.json())
    }

    // after getting all of the current user's userPets, update all userPets' happiness scores
    updatePetStatuses = async (userPets) => {
        for (let i = 0; i < userPets.length; i++) {
            await fetch(`http://localhost:3000/user_pets/${userPets[i].id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(this.calculatePetHappiness(userPets[i]))
            })
            .then(res => res.json())
            .then(userPet => {
                userPets[i] = userPet
                return
            })
        }
        return userPets
    }

    // calculate a given userPet's happiness on login
    calculatePetHappiness = (userPet) => {
        const currentTime = new Date()
        const timeSinceLastFed = (currentTime - Date.parse(userPet.last_fed))/1000
        const timeSinceLastSlept = (currentTime - Date.parse(userPet.last_slept))/1000
        const timeSinceLastCleaned = (currentTime - Date.parse(userPet.last_cleaned))/1000

        const feedIn = Math.floor(userPet.pet.hunger_rate - timeSinceLastFed)
        const sleepIn = Math.floor(userPet.pet.sleepy_rate - timeSinceLastSlept)
        const cleanIn = Math.floor(userPet.pet.dirt_rate - timeSinceLastCleaned)

        const happinessLostFromHunger = feedIn < 0 ? -feedIn : 0
        const happinesLostFromSleepiness = sleepIn < 0 ? -sleepIn : 0
        const happinessLostFromCleanliness = cleanIn < 0? -cleanIn : 0
        const happiness = userPet.happiness_score - (happinessLostFromHunger + happinesLostFromSleepiness + happinessLostFromCleanliness)
        const body = { 'happiness_score': happiness > 0 ? happiness : 0 }
        return body
    }

    // callback for interval (every 1s): updates happiness_score, last_fed, last_slept, and last_cleaned for all pets
    checkPetStatus = async () => {
        const currentTime = new Date()
        let deletePetsArr = new Array(this.state.userPets.length).fill(false)
        let decreaseHappinessArr = new Array(this.state.userPets.length).fill(0)

        for (let i = 0; i < this.state.userPets.length; i++) {
            const userPet = this.state.userPets[i]
            
            if (userPet.happiness_score <= 0) {
                deletePetsArr[i] = true
            }

            else {
                const timeSinceLastFed = userPet.last_fed ? (currentTime - Date.parse(userPet.last_fed))/1000 : userPet.pet.hunger_rate
                const timeSinceLastSlept = userPet.last_slept ? (currentTime - Date.parse(userPet.last_slept))/1000 : userPet.pet.sleepy_rate
                const timeSinceLastCleaned = userPet.last_cleaned? (currentTime - Date.parse(userPet.last_cleaned))/1000 : userPet.pet.dirt_rate
                let decreaseHappinessBy = 0

                decreaseHappinessBy = timeSinceLastFed >= userPet.pet.hunger_rate ? decreaseHappinessBy+1 : decreaseHappinessBy
                decreaseHappinessBy = timeSinceLastSlept >= userPet.pet.sleepy_rate ? decreaseHappinessBy+1 : decreaseHappinessBy
                decreaseHappinessBy = timeSinceLastCleaned >= userPet.pet.dirt_rate ? decreaseHappinessBy+1 : decreaseHappinessBy

                if (this.state.currentPet && this.state.currentPet.id === userPet.id) {
                    timeSinceLastFed < userPet.pet.hunger_rate ? 
                        this.setState({ feedIn: Math.floor(userPet.pet.hunger_rate - timeSinceLastFed) }) :
                        this.setState({ feedIn: -1 })

                    timeSinceLastSlept < userPet.pet.sleepy_rate ?
                        this.setState({ sleepIn: Math.floor(userPet.pet.sleepy_rate - timeSinceLastSlept) }) :
                        this.setState({ sleepIn: -1 })

                    timeSinceLastCleaned < userPet.pet.dirt_rate ?
                        this.setState({ cleanIn: Math.floor(userPet.pet.dirt_rate - timeSinceLastCleaned) }) :
                        this.setState({ cleanIn: -1 })
                }
                decreaseHappinessArr[i] = decreaseHappinessBy
            }
        }

        await this.decreaseHappiness(decreaseHappinessArr)
        const deletedPets = await this.deletePets(deletePetsArr)
        this.setState(prevState => {
            return { deletedPets: [...prevState.deletedPets].concat(deletedPets) }
        })
    }

    decreaseHappiness = async (decreaseHappinessArr) => {
        for(let i = 0; i < decreaseHappinessArr.length; i++) {
            const userPet = this.state.userPets[i]
            const body = { happiness_score: userPet.happiness_score - decreaseHappinessArr[i] > 0 ? userPet.happiness_score - decreaseHappinessArr[i] : 0 }
            await fetch(`http://localhost:3000/user_pets/${userPet.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type' : 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(updatedUserPet => this.setState(prevState => {
                let updatedUserPets = [...prevState.userPets]
                updatedUserPets[i] = updatedUserPet
                return userPet.id === prevState.currentPet.id ? 
                { currentPet: updatedUserPet, userPets: updatedUserPets} : 
                { userPets: updatedUserPets}
            }))
        }
    }

    deletePets = async (deletePetsArr) => {
        let deletedPets = []
        for (let i = deletePetsArr.length; i > -1; i--) {
            if (deletePetsArr[i]) {
                const userPet = this.state.userPets[i]
                deletedPets.push(userPet)

                await fetch(`http://localhost:3000/user_pets/${userPet.id}`, { method: 'DELETE'})
                .then(() => {
                    this.setState(prevState => {
                        let updatedUserPets = [...prevState.userPets]
                        updatedUserPets.splice(i, 1)

                        return userPet.id === prevState.currentPet.id ? 
                        { 
                            currentPet: updatedUserPets.length > 0 ? updatedUserPets[0] : null, 
                            userPets: updatedUserPets
                        } :
                        { userPets: updatedUserPets }
                    })
                })
            }
        }
        return deletedPets
    }

    alertDeletedPets = () => {
        return this.state.deletedPets.map(pet => {
            return (
                <Alert key={pet.id} variant="danger" onClose={() => this.closeDeletedPetAlert(pet.id)} dismissible>
                    <p>{pet.name} the {pet.pet.species} ran away due to neglection. Shame on you!</p>
                </Alert>
            )
        })
    }

    closeDeletedPetAlert = (id) => {
        const deletedPetIdx = this.state.deletedPets.findIndex(pet => pet.id === id)
        this.setState(prevState => {
            const newDeletedPetsArr = [...prevState.deletedPets]
            newDeletedPetsArr.splice(deletedPetIdx, 1)

            return { deletedPets: newDeletedPetsArr }
        })
    }

    purchasePets = () => {
        this.setState({ tamaStore: true, miniGames: false })
    }

    updateMoneyLeft = (amount) => {
        let money = this.state.money + amount
        
        fetch(`http://localhost:3000/users/${this.props.user.id}`,{
            method: 'PATCH',
            headers: {
                'Content-Type' : 'application/json',
                'Accept' : 'application/json'
            },
            body: JSON.stringify({
                money
            })
        })
        .then(resp => resp.json())
        .then(data => this.setState({
            money: data.money 
        }))
    }

    handleIconClick = (currentPet) => {
        this.setState({
            tamaStore: false,
            ticTacToe: false,
            currentPet
        })
    }

    handleActionBtnClick = (e) => {
        let dateTime = new Date();
        let body = {
            'happiness_score': this.state.currentPet.happiness_score + 10 <= 100 ? 
            this.state.currentPet.happiness_score + 10 :
            100
        }
        switch(e.target.id) {
            case 'feed-btn':
                body['last_fed'] = dateTime
                break
            case 'sleep-btn':
                body['last_slept'] = dateTime
                break
            case 'clean-btn':
                body['last_cleaned'] = dateTime
                break
            default:
                return
        }

        fetch(`http://localhost:3000/user_pets/${this.state.currentPet.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type' : 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(res => res.json())
        .then(updatedPet => {
            let feedIn = this.state.feedIn
            let sleepIn = this.state.sleepIn
            let cleanIn = this.state.cleanIn
            switch (e.target.id) {
                case 'feed-btn':
                    feedIn = updatedPet.pet.hunger_rate
                    break
                case 'sleep-btn':
                    sleepIn = updatedPet.pet.sleepy_rate2
                    break
                case 'clean-btn':
                    cleanIn = updatedPet.pet.dirt_rate
                    break
                default:
                    break
            }

            this.setState(prevState => {
                let updatedUserPets = prevState.userPets
                let petIdx = prevState.userPets.findIndex(userPet => userPet.id === prevState.currentPet.id)
                updatedUserPets[petIdx] = updatedPet

                return {
                    userPets: updatedUserPets,
                    currentPet: updatedPet,
                    feedIn,
                    sleepIn,
                    cleanIn
                }
            })
        })
    }


    purchaseTama = (newTama) => {
        this.openModal()
        this.renderModalForm()
        this.setState({ newTama })
    }

    updatePetList = (newUserPet) =>{
        this.setState(prevState => {
            return{
                userPets: [...prevState.userPets, newUserPet],
                currentPet: newUserPet,
                tamaStore: false,
                ticTacToe: false
            }
        })
    }

    // create new userpets
    createUserPetData =  () => {
        const currentTime = new Date()
        const petSpecies = this.state.newTama
        // update database with new user pet
        // reach out to Lantz or Hal JWT
        fetch('http://localhost:3000/user_pets',{
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json',
                'Accept' : 'application/json'
            },
            body: JSON.stringify({
                name: petSpecies.name,
                user_id: this.props.user.id,
                pet_id: petSpecies.id,
                last_fed: new Date(currentTime.getTime() - (petSpecies.hunger_rate*1000)),
                last_slept: new Date(currentTime.getTime() - (petSpecies.sleepy_rate*1000)),
                last_cleaned: new Date(currentTime.getTime() - (petSpecies.dirt_rate*1000))
            })
        })
        .then(resp => resp.json())
        .then(data => {
            this.updatePetList(data)
        })
    }

    // handle modal form
    openModal = () => this.setState({ isOpen: true });
    closeModal = () => this.setState({ isOpen: false });
    renderModalForm = () => this.setState({ modalForm: true })

    // naming tama
    handleSubmit = (tamaName) => {
        this.setState(prevState =>{
          return{
            modalForm: false,
            newTama: {...prevState.newTama, name: tamaName}
          }
        }, () => {
            this.createUserPetData()
            this.updateMoneyLeft(-this.state.newTama.price)
        })

        this.closeModal()
    }

    startMiniGame = (e) => {
        if (e.id) {
            this.setState({[e.id]: true, gamble:e.gamble, tamaStore: false, miniGames: false})
        } else {
            this.setState({miniGames: true, tamaStore: false, ticTacToe: false, janKen: false})
        }
    }

    render(){
        {console.log(this.state)}
        return(
            <div className="home">
                <SideNav
                    userPets={this.state.userPets}
                    tamaStore={this.state.tamaStore}
                    purchasePets={this.purchasePets}
                    handleIconClick={this.handleIconClick}
                    startMiniGame={this.startMiniGame}
                />

                <div>{this.state.deletedPets.length > 0 ? this.alertDeletedPets() : null}</div>
                <div id="greeting">{!!this.props.user ? `Hi ${this.props.user.name}!     You have ${this.state.money} coins.`: null}</div>

                <Tamagotchi
                    allSpecies={this.state.allSpecies}
                    currentPet={this.state.currentPet}
                    tamaStore={this.state.tamaStore}
                    user={this.props.user}
                    token={this.props.token}
                    purchaseTama={this.purchaseTama}
                    ticTacToe={this.state.ticTacToe}
                    handleActionBtnClick={this.handleActionBtnClick}
                    feedIn ={this.state.feedIn}
                    sleepIn = {this.state.sleepIn}
                    cleanIn = {this.state.cleanIn}
                    startMiniGame={this.startMiniGame}
                    janKen={this.state.janKen}
                    miniGames={this.state.miniGames}
                    money={this.state.money}
                    updateMoneyLeft={this.updateMoneyLeft}
                    gamble={this.state.gamble}
                />

                { this.state.modalForm ?
                    <ModalForm
                        closeModal={this.closeModal}
                        isOpen={this.state.isOpen}
                        handleSubmit={this.handleSubmit}
                    />
                    : null
                }

            </div>
        )
    }
}

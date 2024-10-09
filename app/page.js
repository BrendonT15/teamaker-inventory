'use client';
import dynamic from 'next/dynamic'; // Dynmaically import a component, useful for code-splitting (only load when it's actually needed)
import { faUser, faEye } from '@fortawesome/free-regular-svg-icons'; // Correct icon import
import { faBars, faPlus, faMinus, faX, faExclamation, faExclamationTriangle, faBan} from '@fortawesome/free-solid-svg-icons';
import { firestore } from "@/firebase";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import './index.css';

const FontAwesomeIcon = dynamic(() => import('@fortawesome/react-fontawesome').then((mod) => mod.FontAwesomeIcon), { ssr: false });
// FontAwesomeIcon becomes the variable to hold the contents of fontawesome
// The dynamic function calls an arrow function to import the package, (A PROMISE)
// THEN (a method) the 'mod' variable is a module object that contains everything exported by the fontawesome package
// However if the PROMISE is not upheld then ssr is set to false


// React Hydration Error - When React tries to make an existing static HTML (rendered by server) interactive by attaching REACT components to it
// If the HTML content rendered on the server differs from what React expects on the client side, it triggers a hydration error
// Server generates static HTML to Client -> React takes over static HTML and "hydrates" it.
// powder syrup jam toppings drinkware(straws,cups,lids) ingredients (cheesefoam powder, coffeemate, etc.), Teas, Other
export default function Home() {
  const [inventory, setInventory] = useState([])
  const [selectedInventory, setSelected] = useState('Manhattan Inventory')
  const [isSideBarVisible, setSideBarVisible] = useState(false)
  const [search, setSearch] = useState('')
  
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false);
  
  const filterOptions = ['powder', 'syrup', 'jam', 'topping', 'tea', 'drinkware', 'ingredients', 'other'];
  const initialFilters = filterOptions.reduce((acc, filter) => {
    acc[filter] = false;
    return acc;
  }, {});

  const [filters, setFilters] = useState(initialFilters);
  
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: checked,
    }));
  };

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, selectedInventory))  
    const docs = await getDocs(snapshot)
    const inventoryList = []
    docs.forEach((doc)=>(
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      })
    ))
    setInventory(inventoryList)
  }

  const addItem = async (item) => {
    try {
      const lowerCaseItem = (item.name || '').toLowerCase().trim();
      const lowerCaseType = (item.type || 'Unknown').toLowerCase().trim();

      if (!selectedInventory || !lowerCaseItem) {
        throw new Error('Invalid collection or Item');
      }
  
      const docRef = doc(collection(firestore, selectedInventory), lowerCaseItem);
      const docSnap = await getDoc(docRef);
      
      const itemData = {
        type: lowerCaseType || 'Unknown',
      };
      /*
      if (docSnap.exists()) {
        const docData = docSnap.data();
        console.log('Existing Document Data:', docData);
        await setDoc(docRef, { quantity: docData.quantity + 1, ...itemData}, { merge: true });
        console.log(typeof(docData.quantity));
      } else {
        await setDoc(docRef, { quantity: 1, ...itemData}, { merge: true });
      }
      */
      
      if (docSnap.exists()) {
        const {quantity} = docSnap.data()
        await setDoc(docRef, {quantity: quantity + 1}, {merge: true})
      } else {
        await setDoc(docRef, {quantity: 1, ...itemData}, {merge: true})
      }
      
      await updateInventory();
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };


  const removeItem = async (item) => {
    try {
      const lowerCaseItem = item.toLowerCase().trim();
  
      const docRef = doc(collection(firestore, selectedInventory), lowerCaseItem);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity === 0) {
          return;
        } else {
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });
        }
      }
  
      await updateInventory();
    } catch (error) {
      console.error('Error removing document: ', error);
    }
  };


  useEffect(() => {
    updateInventory()
  }, [selectedInventory])

  // INVENTORY ITEM
  const InventoryItem = ({ item }) => {
    const [quantity, setQuantity] = useState(item.quantity);

    const handleQuantityChange = async (item, e) => {
      const newQuantity = parseInt(e.target.value, 10); // converts into a decimal number
      if (isNaN(newQuantity) || newQuantity < 0) return;  // if there is no number or the number is less than 0 then do nothing
      const itemRef = doc(collection(firestore, selectedInventory), item.name); // references to a specific document in the firestore database and finds the item with the same name
      await updateDoc(itemRef, {quantity: newQuantity});  // after the item reference is located, it will update the document with the new quantity
      updateInventory(); // reupdates inventory
    }

    return (
      <div className="inventory_item">
        <div className="left_inventory">
          <span>{item.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
          <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
          <span>{item.quantity > 5 ? <FontAwesomeIcon icon={faBan} className="restock"/> : item.quantity > 2 ? <FontAwesomeIcon icon={faEye} className="restock"/> : <FontAwesomeIcon icon={faExclamationTriangle} className="restock yes_restock"/>}</span>
        </div>
        <div className="right_inventory">
          <div className='right_quantity'>
            <FontAwesomeIcon icon={faMinus} className="button remove_button" onClick={() => removeItem(item.name)} />
            <input
              className="quantity_input"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={(e) => handleQuantityChange(item, e)}
              onKeyDown={(e) => {if (e.key === 'Enter'){
                  handleQuantityChange(item, e)
                }}
              }
            />
            <FontAwesomeIcon icon={faPlus} className="button add_button" onClick={() => addItem(item)} />
           </div> 
            <FontAwesomeIcon icon={faX} className="button delete_button" onClick={handleOpenModal}/>
        </div>

      <ModalRemove
        isOpen={showModal}
        onClose={handleCloseModal}
        deleteItem={item.name}
      />

      </div>
    );
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const ModalRemove = ({ isOpen, onClose, deleteItem }) => {
    const handleDelete = async () => {
      const lowerCaseItem = deleteItem.toLowerCase().trim();
      const docRef = doc(collection(firestore, selectedInventory), lowerCaseItem);
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        await deleteDoc(docRef);
      }
      await updateInventory();
      onClose();
    }

    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <FontAwesomeIcon icon={faX} className="modal-close" onClick={handleCloseModal}/>
          <h2>Are you sure you want to delete this item?</h2>
          <div className="modal-buttons">
            <button className="button yes_delete" onClick={handleDelete}>Yes</button>
            <button className="button no_delete" onClick={onClose}>No</button>
          </div>
        </div>
      </div>
    )
  };

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const ModalAdd = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!name || !type) return;
      const newItem = {name, type};
      await onSubmit(newItem);
      setName('')
      setType('')
      onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
          <div className="modal-content">
            <FontAwesomeIcon icon={faX} className="modal-close" onClick={handleClose}/>
            <h2>Add New Item</h2>
            <form id="add-item-form" onSubmit={handleSubmit}>
              <label>
                <input
                  type="text"
                  value={name}
                  placeholder="Item Name"
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                <input
                  type="text"
                  value={type}
                  placeholder="Item Type"
                  onChange={(e) => setType(e.target.value)}
                  required
                />
              </label>
              <button type="submit" onClick={handleSubmit}>Add Item</button>
            </form>
          </div>
        </div>
    )
  }
  
  return (
    <>
      <head>
        <title>{selectedInventory === 'Manhattan Inventory' ? 'TeaMaker Manhattan' : 'TeaMaker Brooklyn'}</title>
      </head>

      <body className="home">

        {/* Masks Home Page */}
        <div className="mask">

          {/* Nav Bar */}
          <div id="header">
            <h1>{selectedInventory === 'Manhattan Inventory' ? 'Manhattan Inventory' : 'Brooklyn Inventory'}</h1>
            <div className="nav_bar">
              <div className="side hamburger" onClick={() => setSideBarVisible(!isSideBarVisible)}>
                <FontAwesomeIcon icon={faBars} className="hamburger_icon"/>
              </div>
            </div>

          </div>

          {/* Side Bar */}
          <div className={`side_bar ${isSideBarVisible ? 'visible' : ''}`}>
            <FontAwesomeIcon icon={faX} className="side x_icon" onClick={() => setSideBarVisible(!isSideBarVisible)}/>
            <div className="sidebar_content">
              <h2>Locations</h2>
              <ul className="locations">
                <li className="side Manhattan" onClick={() => setSelected('Manhattan Inventory')}>Manhattan</li>
                <li className="side Brooklyn" onClick={() => setSelected('Brooklyn Inventory')}>Brooklyn</li>
              </ul>
            </div>
            <p>©2024 Brendon Thai <br/>
              TeaMakers
            </p>
          </div>
          
          {/* Overarching Centered Container */}
          <div id="centered_container">
            {/* Inventory Functions Container */}
            <div id="top_container">
            <fieldset className="filters">
              <legend>Filters:</legend>
              <div>
                {filterOptions.map((filter) => (
                  <div key={filter}>
                    <input
                      type="checkbox"
                      id={`filter_${filter}`}
                      name={filter}
                      checked={filters[filter]}
                      onChange={handleCheckboxChange}
                    />
                    <label htmlFor={`filter_${filter}`}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</label>
                  </div>
                ))}
              </div>
            </fieldset>

              <div id="function_container">
              {/* Search Bar */}
                <input className="search_bar" type="text" placeholder="Search Item" onChange={(e) => {setSearch(e.target.value)}}/>
              {/* Add Button */}
                <button className='btn add' onClick={handleOpen}>Add Item</button>
              </div>
            </div>
          
          {/* Inventory Items */}
            <div id="inventory_container">
              <div className="inventory_banner">
                <div className="left_banner">
                  <span id="item">Item Name</span>
                  <span id="type">Type</span>
                  <span id="Restock">Restock</span>
                </div>
                <div className="right_banner">
                  <span id="quantity">Quantity</span>
                </div>
              </div>
              {/* Map Through inventory and display each Item */}
              {
                inventory.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).filter((item) => {
                  console.log('Item Type:', item.type.toLowerCase());
                  console.log('Filter Check:', filters[item.type.toLowerCase()]);
                  return filters[item.type.toLowerCase()] || !Object.values(filters).includes(true);
                }).sort((a, b) => {
                  if (a.type.toLowerCase() < b.type.toLowerCase()) return -1;
                  if (a.type.toLowerCase() > b.type.toLowerCase()) return 1;
                  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                }).map((item) => (
                  <InventoryItem key={item.name} item={item} />
                ))
              }

          {/* Modal */}      
            <ModalAdd isOpen={open} onClose={handleClose} onSubmit={addItem}/>
            </div>
          </div>
        </div>

      </body>
    </>
  );
}
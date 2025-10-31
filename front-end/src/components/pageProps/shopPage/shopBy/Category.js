import React, { useState, useEffect } from "react";
// import { FaPlus } from "react-icons/fa";
import { ImPlus } from "react-icons/im";
import NavTitle from "./NavTitle";
import { useDispatch, useSelector } from "react-redux";
import { toggleCategory } from "../../../../redux/orebiSlice";
import CategoryService from "../../../../services/api/CategoryService";
import { motion } from "framer-motion";
const Category = ({ categories: propCategories = null, selectedIds = null, onToggle = null, compact = false }) => {
  const [showSubCatOne, setShowSubCatOne] = useState(true);
  const [category, setCategory] = useState(propCategories || []);
  useEffect(() => {
    if (propCategories) return; // use provided categories from parent
    const fetchCategory = async () => {
      const allCategory = await CategoryService.getAllCategories();
      setCategory(allCategory);
    };

    fetchCategory();
  }, [propCategories]);
  const checkedCategorys = useSelector(
    (state) => (state && state.orebiReducer && Array.isArray(state.orebiReducer.checkedCategorys) ? state.orebiReducer.checkedCategorys : [])
  );
  const dispatch = useDispatch();

  // Use parent-controlled selectedIds/onToggle when provided, otherwise fall back to Redux
  const isSelected = (catId) => {
    if (Array.isArray(selectedIds)) return selectedIds.includes(catId);
    return checkedCategorys.some((b) => b._id === catId);
  };

  const handleToggleCategory = (categoryItem) => {
    if (typeof onToggle === 'function') {
      onToggle(categoryItem._id);
      return;
    }
    dispatch(toggleCategory(categoryItem));
  };

  return (
    <div className="w-full">
      <div
        onClick={() => setShowSubCatOne(!showSubCatOne)}
        className="cursor-pointer"
      >
        <NavTitle title="Shop by Category" icons={true} />
      </div>

      {showSubCatOne && (
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mt-3"
        >
          {/* Horizontal scrollable circular categories */}
          <div className="overflow-x-auto py-2">
            <ul className="flex gap-6 items-center px-2">
              {category.map((item) => {
                const isActive = isSelected(item._id);
                const sizeClass = compact ? 'w-28 h-28' : 'w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44';
                const imgSizeClass = compact ? 'w-16 h-16' : 'w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32';
                return (
                  <li key={item._id} className="flex-shrink-0">
                    <button
                      aria-pressed={isActive}
                      onClick={() => handleToggleCategory(item)}
                      className={`${sizeClass} flex flex-col items-center justify-center rounded-full bg-gray-100 shadow-md relative transform transition-all duration-200 hover:scale-105 focus:outline-none ${isActive ? 'ring-4 ring-primeColor/30' : ''}`}
                    >
                      {/* Image or fallback initials */}
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className={`${imgSizeClass} object-contain rounded-full bg-white p-2`}
                        />
                      ) : (
                        <div className={`${imgSizeClass} rounded-full bg-white flex items-center justify-center text-xl font-semibold text-gray-600`}>
                          {item.name?.split(' ').map(s=>s[0]).slice(0,2).join('')}
                        </div>
                      )}

                      <span className={`mt-3 text-sm lg:text-base font-medium ${isActive ? 'text-primeColor' : 'text-gray-700'}`}>
                        {item.name}
                      </span>

                      {/* Active check mark */}
                      {isActive && (
                        <span className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8.364 8.364a1 1 0 01-1.414 0L3.293 11.03a1 1 0 111.414-1.414l2.828 2.829 7.657-7.657a1 1 0 011.415 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Category;

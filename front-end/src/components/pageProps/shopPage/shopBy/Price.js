import React from "react";
import { useDispatch, useSelector } from "react-redux";
import NavTitle from "./NavTitle";
import { togglePrice } from "../../../../redux/orebiSlice";

const Price = () => {
  const priceList = [
    { _id: 950, priceOne: 0.0, priceTwo: 49.99 },
    { _id: 951, priceOne: 50.0, priceTwo: 99.99 },
    { _id: 952, priceOne: 100.0, priceTwo: 199.99 },
    { _id: 953, priceOne: 200.0, priceTwo: 399.99 },
    { _id: 954, priceOne: 400.0, priceTwo: 599.99 },
    { _id: 955, priceOne: 600.0, priceTwo: 999.0 },
    { _id: 956, priceOne: 1000.0, priceTwo: 2999.0 },
  ];

  const checkedPrices = useSelector((state) => state.orebiReducer.checkedPrices);
  const dispatch = useDispatch();

  const handleTogglePrice = (price) => {
    dispatch(togglePrice(price));
  };

  return (
    <div className="cursor-pointer">
      <NavTitle title="Shop by Price" icons={false} />
      <div className="font-titleFont">
        <ul className="flex flex-col gap-4 text-sm lg:text-base text-[#767676]">
          {priceList.map((item) => (
            <li
              key={item._id}
              className="border-b-[1px] border-b-[#F0F0F0] pb-2 flex items-center gap-2 hover:text-primeColor hover:border-gray-400 duration-300"
            >
              <input
                type="checkbox"
                id={item._id}
                checked={checkedPrices.some((p) => p._id === item._id)}
                onChange={() => handleTogglePrice(item)}
              />
              ${item.priceOne.toFixed(2)} - ${item.priceTwo.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Price;
